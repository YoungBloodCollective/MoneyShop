using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Loads what <see cref="CommissionMonth"/> needs for a month. The network volume reads every
    /// MoneyShop broker's disbursed files unscoped and keeps only sums per bank and credit type.
    /// </summary>
    public class CommissionCalculator : ICommissionCalculator
    {
        private readonly MoneyShopDbContext _context;
        private readonly TimeZoneInfo _zone;

        public CommissionCalculator(MoneyShopDbContext context)
        {
            _context = context;
            _zone = RomaniaTime.Zone;
        }

        public CommissionMonth ForMonth(string month)
        {
            if (!DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                throw new InvalidOperationException("Luna trebuie să fie în formatul AAAA-LL.");
            var start = new DateTime(parsed.Year, parsed.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
            return ForRange(TimeZoneInfo.ConvertTimeToUtc(start, _zone), TimeZoneInfo.ConvertTimeToUtc(start.AddMonths(1), _zone));
        }

        public CommissionMonth ForRange(DateTime fromUtc, DateTime toUtc)
        {
            var tiers = _context.BankCommissionTiers.AsNoTracking().ToList()
                .GroupBy(t => (t.BankId, t.CreditType))
                .ToDictionary(g => g.Key, g => g.OrderBy(t => t.FromAmount)
                    .Select(t => new CommissionTierRow { From = t.FromAmount, To = t.ToAmount, Percent = t.Percent }).ToList());
            var moneyShop = _context.BrokerProfiles.AsNoTracking().Where(p => p.Type == BrokerTypes.MoneyShop).Select(p => p.Id).ToHashSet();
            var volume = _context.BankFiles.IgnoreQueryFilters().AsNoTracking()
                .Where(f => f.Status == BankFileStatuses.Disbursat && f.BankId != null && f.CreditType != null
                            && f.StatusChangedAt >= fromUtc && f.StatusChangedAt < toUtc)
                .Select(f => new { f.BrokerProfileId, BankId = f.BankId ?? 0, f.CreditType, f.Amount })
                .ToList()
                .Where(f => f.BrokerProfileId != null && moneyShop.Contains(f.BrokerProfileId.Value) && CreditTypes.IsValid(f.CreditType))
                .GroupBy(f => (f.BankId, f.CreditType!))
                .ToDictionary(g => g.Key, g => g.Sum(f => f.Amount));
            var overrides = BrokerCommissionRates.Expand(_context.BrokerBankCommissions.AsNoTracking().ToList());
            var defaults = _context.Banks.AsNoTracking().ToDictionary(b => b.Id, b => b.CommissionPercent);
            return new CommissionMonth(tiers, volume, moneyShop, overrides, defaults);
        }
    }

    internal static class RomaniaTime
    {
        public static readonly TimeZoneInfo Zone = Resolve();

        private static TimeZoneInfo Resolve()
        {
            foreach (var id in new[] { "Europe/Bucharest", "GTB Standard Time" })
            {
                try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch (TimeZoneNotFoundException) { } catch (InvalidTimeZoneException) { }
            }
            return TimeZoneInfo.Utc;
        }
    }
}
