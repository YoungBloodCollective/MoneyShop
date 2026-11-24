using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using BankEntity = MoneyShop.DomainModel.Entities.Bank;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Disbursed volume per broker type and month. A file counts in the month its status changed to
    /// disbursed (same rule as the bank stats). The Super Admin reads through the standard scope
    /// (no broker scope means every file); a MoneyShop broker reads the network unscoped after the
    /// type check, and only ever gets sums and counts.
    /// </summary>
    public class CrmNetworkService : ICrmNetworkService
    {
        private const int MaxMonths = 36;

        private readonly MoneyShopDbContext _context;
        private readonly TimeZoneInfo _zone;

        public CrmNetworkService(MoneyShopDbContext context)
        {
            _context = context;
            _zone = ResolveZone();
        }

        private static TimeZoneInfo ResolveZone()
        {
            foreach (var id in new[] { "Europe/Bucharest", "GTB Standard Time" })
            {
                try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch (TimeZoneNotFoundException) { } catch (InvalidTimeZoneException) { }
            }
            return TimeZoneInfo.Utc;
        }

        private sealed record Row(int? BrokerProfileId, string BankName, int? BankId, string? CreditType, decimal Amount, string Month);

        public AdminDashboardResult GetAdminDashboard(int months, int? year, int? monthNumber)
        {
            if (_context.BrokerScopeId != null)
                throw new InvalidOperationException("Dashboardul Super Admin este disponibil doar administratorilor.");

            months = Math.Clamp(months, 1, MaxMonths);
            var current = LocalMonth(DateTime.UtcNow);
            var selected = ResolveMonth(year, monthNumber, current);
            var window = Enumerable.Range(0, months).Select(i => ShiftMonth(current, i - (months - 1))).ToList();
            var from = string.CompareOrdinal(selected, window[0]) < 0 ? selected : window[0];

            var profiles = _context.BrokerProfiles.AsNoTracking()
                .Select(p => new { p.Id, p.Type, p.Status }).ToList();
            var typeById = profiles.ToDictionary(p => p.Id, p => p.Type);
            var rows = LoadRows(_context.BankFiles.AsNoTracking(), from);
            var catalog = _context.Banks.AsNoTracking().AsEnumerable().OrderBy(b => b.SortOrder).ThenBy(b => b.Name).ToList();
            var defaults = catalog.ToDictionary(b => b.Id, b => b.CommissionPercent);

            return new AdminDashboardResult
            {
                CurrentMonth = current,
                SelectedMonth = selected,
                MoneyShop = Section(BrokerTypes.MoneyShop, rows, typeById, profiles.Count(p => p.Type == BrokerTypes.MoneyShop && p.Status == "Active"), window, selected, defaults, catalog),
                Affiliates = Section(BrokerTypes.Afiliat, rows, typeById, profiles.Count(p => p.Type == BrokerTypes.Afiliat && p.Status == "Active"), window, selected, defaults, catalog),
            };
        }

        public NetworkMonthSummary? GetNetwork(int userId, bool isAdmin, int? year, int? month)
        {
            if (!isAdmin)
            {
                var type = _context.BrokerProfiles.AsNoTracking()
                    .Where(p => p.UserId == userId && p.Status == "Active")
                    .Select(p => p.Type).FirstOrDefault();
                if (type != BrokerTypes.MoneyShop) return null;
            }

            var selected = ResolveMonth(year, month, LocalMonth(DateTime.UtcNow));
            var moneyShopIds = _context.BrokerProfiles.AsNoTracking()
                .Where(p => p.Type == BrokerTypes.MoneyShop).Select(p => p.Id).ToHashSet();
            var rows = LoadRows(_context.BankFiles.IgnoreQueryFilters().AsNoTracking(), selected)
                .Where(r => r.BrokerProfileId != null && moneyShopIds.Contains(r.BrokerProfileId.Value) && r.Month == selected)
                .ToList();
            return Summarize(selected, rows, _context.Banks.AsNoTracking().AsEnumerable().OrderBy(b => b.SortOrder).ThenBy(b => b.Name).ToList());
        }

        private List<Row> LoadRows(IQueryable<BankFile> files, string fromMonth)
        {
            var (y, m) = Split(fromMonth);
            var fromUtc = TimeZoneInfo.ConvertTimeToUtc(new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Unspecified), _zone);
            return files.Where(f => f.Status == BankFileStatuses.Disbursat && f.StatusChangedAt >= fromUtc)
                .Select(f => new { f.BrokerProfileId, f.BankName, f.BankId, f.CreditType, f.Amount, f.StatusChangedAt })
                .ToList()
                .Select(f => new Row(f.BrokerProfileId, (f.BankName ?? string.Empty).Trim(), f.BankId, f.CreditType, f.Amount, LocalMonth(f.StatusChangedAt)))
                .ToList();
        }

        private static NetworkSection Section(string type, List<Row> rows, Dictionary<int, string> typeById, int activeBrokers,
            List<string> window, string selected, Dictionary<int, decimal> bankDefaults, List<BankEntity> catalog)
        {
            var mine = rows.Where(r => r.BrokerProfileId != null && typeById.TryGetValue(r.BrokerProfileId.Value, out var t) && t == type).ToList();
            var byMonth = mine.GroupBy(r => r.Month).ToDictionary(g => g.Key, g => (Amount: g.Sum(r => r.Amount), Count: g.Count()));
            var selectedRows = mine.Where(r => r.Month == selected).ToList();
            var section = new NetworkSection
            {
                Type = type,
                ActiveBrokers = activeBrokers,
                Selected = Summarize(selected, selectedRows, catalog),
                Series = window.Select(m => new NetworkMonthPoint
                {
                    Month = m,
                    Amount = byMonth.TryGetValue(m, out var v) ? v.Amount : 0m,
                    Count = byMonth.TryGetValue(m, out var v2) ? v2.Count : 0,
                }).ToList(),
            };
            if (type == BrokerTypes.MoneyShop)
                section.EstimatedCommission = Math.Round(selectedRows
                    .Sum(r => r.Amount * (r.BankId != null && bankDefaults.TryGetValue(r.BankId.Value, out var p) ? p : 0m) / 100m), 2);
            return section;
        }

        private static NetworkMonthSummary Summarize(string month, List<Row> rows, List<BankEntity> catalog)
        {
            var cards = new List<NetworkBankPoint>();
            var used = new HashSet<Row>();
            foreach (var bank in catalog.Where(b => b.Active))
            {
                var mine = rows.Where(r => Matches(r, bank)).ToList();
                foreach (var r in mine) used.Add(r);
                cards.Add(Card(bank.Id, bank.Name, mine));
            }
            var rest = rows.Where(r => !used.Contains(r))
                .GroupBy(r => r.BankName)
                .OrderBy(g => g.Key)
                .Select(g => Card(g.First().BankId, g.Key, g.ToList()));
            cards.AddRange(rest);
            return new NetworkMonthSummary { Month = month, Total = Volume(rows), Banks = cards };
        }

        private static bool Matches(Row r, BankEntity bank) =>
            r.BankId != null ? r.BankId == bank.Id : string.Equals(r.BankName, bank.Name.Trim(), StringComparison.OrdinalIgnoreCase);

        private static NetworkBankPoint Card(int? bankId, string name, List<Row> rows)
        {
            var v = Volume(rows);
            return new NetworkBankPoint
            {
                BankId = bankId, BankName = name, Amount = v.Amount, Count = v.Count,
                NpAmount = v.NpAmount, NpCount = v.NpCount, IpAmount = v.IpAmount, IpCount = v.IpCount,
            };
        }

        private static NetworkVolume Volume(IEnumerable<Row> rows)
        {
            var v = new NetworkVolume();
            foreach (var r in rows)
            {
                v.Amount += r.Amount;
                v.Count++;
                if (r.CreditType == CreditTypes.Np) { v.NpAmount += r.Amount; v.NpCount++; }
                else if (r.CreditType == CreditTypes.Ip) { v.IpAmount += r.Amount; v.IpCount++; }
            }
            return v;
        }

        private string LocalMonth(DateTime utc)
        {
            var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), _zone);
            return $"{local.Year:D4}-{local.Month:D2}";
        }

        private static string ResolveMonth(int? year, int? month, string current)
        {
            if (year == null && month == null) return current;
            if (year == null || month == null || year < 2000 || year > 2100 || month < 1 || month > 12)
                throw new InvalidOperationException("Alege un an și o lună valide.");
            var label = $"{year:D4}-{month:D2}";
            if (string.CompareOrdinal(label, current) > 0) throw new InvalidOperationException("Nu poți vedea o lună viitoare.");
            return label;
        }

        private static (int Year, int Month) Split(string month) => (int.Parse(month[..4]), int.Parse(month[5..]));

        private static string ShiftMonth(string month, int delta)
        {
            var (y, m) = Split(month);
            var d = new DateTime(y, m, 1).AddMonths(delta);
            return $"{d.Year:D4}-{d.Month:D2}";
        }
    }
}
