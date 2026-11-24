using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using BankEntity = MoneyShop.DomainModel.Entities.Bank;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Bank catalog, per-broker commissions and the monthly bank numbers. The network totals read
    /// every broker's files unscoped but only ever return sums and counts, never rows or client data.
    /// </summary>
    public class BankCatalogService : IBankCatalogService
    {
        private const int MaxName = 100;

        private readonly MoneyShopDbContext _context;
        private readonly ICommissionCalculator _calculator;
        private readonly TimeZoneInfo _zone;

        public BankCatalogService(MoneyShopDbContext context, ICommissionCalculator? calculator = null, ILogger<BankCatalogService>? logger = null)
        {
            _context = context;
            _calculator = calculator ?? new CommissionCalculator(context);
            _zone = ResolveZone(logger);
        }

        private static TimeZoneInfo ResolveZone(ILogger? logger)
        {
            foreach (var id in new[] { "Europe/Bucharest", "GTB Standard Time" })
            {
                try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch (TimeZoneNotFoundException) { } catch (InvalidTimeZoneException) { }
            }
            logger?.LogWarning("The Romania time zone could not be resolved; bank stats fall back to UTC month boundaries.");
            return TimeZoneInfo.Utc;
        }

        public List<BankCatalogItem> GetAllBanks() =>
            _context.Banks.AsNoTracking().AsEnumerable().OrderBy(b => b.SortOrder).ThenBy(b => b.Name).Select(ToItem).ToList();

        public List<BankCatalogItem> GetActiveBanks() =>
            _context.Banks.AsNoTracking().Where(b => b.Active).AsEnumerable().OrderBy(b => b.SortOrder).ThenBy(b => b.Name).Select(ToItem).ToList();

        public BankCatalogItem CreateBank(BankCatalogInput input)
        {
            var bank = new BankEntity();
            Apply(bank, input, null);
            _context.Banks.Add(bank);
            _context.SaveChanges();
            return ToItem(bank);
        }

        public BankCatalogItem? UpdateBank(int bankId, BankCatalogInput input)
        {
            var bank = _context.Banks.FirstOrDefault(b => b.Id == bankId);
            if (bank == null) return null;
            Apply(bank, input, bankId);
            _context.SaveChanges();
            return ToItem(bank);
        }

        public List<BrokerCommissionItem> GetMyCommissions(int userId)
        {
            var profileId = ResolveProfileId(userId);
            var mine = profileId == null
                ? new Dictionary<int, decimal>()
                : _context.BrokerBankCommissions.AsNoTracking().Where(c => c.BrokerProfileId == profileId)
                    .ToDictionary(c => c.BankId, c => c.CommissionPercent);
            return GetActiveBanks().Select(b => new BrokerCommissionItem
            {
                BankId = b.Id,
                Name = b.Name,
                DefaultPercent = b.CommissionPercent,
                MyPercent = mine.TryGetValue(b.Id, out var p) ? p : null,
            }).ToList();
        }

        public BrokerCommissionItem? SetMyCommission(int userId, int bankId, decimal? percent)
        {
            var profileId = ResolveProfileId(userId)
                ?? throw new InvalidOperationException("Doar un broker cu profil propriu își poate seta comisioanele.");
            if (percent is < 0 or > 100) throw new InvalidOperationException("Comisionul trebuie să fie între 0 și 100%.");
            var bank = _context.Banks.FirstOrDefault(b => b.Id == bankId && b.Active);
            if (bank == null) return null;

            var bankName = bank.Name;
            var bankDefault = bank.CommissionPercent;
            var value = percent == null ? (decimal?)null : Math.Round(percent.Value, 2);
            var row = _context.BrokerBankCommissions.FirstOrDefault(c => c.BrokerProfileId == profileId && c.BankId == bankId);
            if (value == null)
            {
                if (row != null) _context.BrokerBankCommissions.Remove(row);
                _context.SaveChanges();
            }
            else if (row != null)
            {
                row.CommissionPercent = value.Value;
                row.UpdatedAt = DateTime.UtcNow;
                _context.SaveChanges();
            }
            else
            {
                _context.BrokerBankCommissions.Add(new BrokerBankCommission
                {
                    BrokerProfileId = profileId,
                    BankId = bankId,
                    CommissionPercent = value.Value,
                    UpdatedAt = DateTime.UtcNow,
                });
                try
                {
                    _context.SaveChanges();
                }
                catch (DbUpdateException)
                {
                    _context.ChangeTracker.Clear();
                    var existing = _context.BrokerBankCommissions.FirstOrDefault(c => c.BrokerProfileId == profileId && c.BankId == bankId);
                    if (existing == null) throw;
                    existing.CommissionPercent = value.Value;
                    existing.UpdatedAt = DateTime.UtcNow;
                    _context.SaveChanges();
                }
            }
            return new BrokerCommissionItem
            {
                BankId = bankId,
                Name = bankName,
                DefaultPercent = bankDefault,
                MyPercent = value,
            };
        }

        public BankStatsResult GetStats(int userId, string? month, bool isAdmin)
        {
            var (label, fromUtc, toUtc) = MonthRange(month);
            var profileId = ResolveProfileId(userId);

            var files = _context.BankFiles.IgnoreQueryFilters().AsNoTracking()
                .Where(f => f.BankId != null && f.Status != BankFileStatuses.Respins
                            && (f.Status != BankFileStatuses.Disbursat || (f.StatusChangedAt >= fromUtc && f.StatusChangedAt < toUtc)))
                .Select(f => new { f.BrokerProfileId, BankId = f.BankId ?? 0, f.CreditType, f.Amount, f.Status })
                .ToList();
            var withFiles = files.Select(f => f.BankId).Distinct().ToList();

            var banks = _context.Banks.AsNoTracking().Where(b => b.Active || withFiles.Contains(b.Id)).AsEnumerable()
                .OrderBy(b => b.SortOrder).ThenBy(b => b.Name).ToList();
            var bankIds = banks.Select(b => b.Id).ToHashSet();
            files = files.Where(f => bankIds.Contains(f.BankId)).ToList();

            var commission = _calculator.ForMonth(label);

            var showNetwork = isAdmin || (profileId != null && _context.BrokerProfiles.AsNoTracking()
                .Any(p => p.Id == profileId && p.Type == BrokerTypes.MoneyShop));
            var moneyShopIds = isAdmin || !showNetwork
                ? null
                : _context.BrokerProfiles.AsNoTracking().Where(p => p.Type == BrokerTypes.MoneyShop).Select(p => p.Id).ToHashSet();
            var networkFiles = !showNetwork
                ? files.Take(0).ToList()
                : moneyShopIds == null ? files : files.Where(f => f.BrokerProfileId != null && moneyShopIds.Contains(f.BrokerProfileId.Value)).ToList();

            var unattributed = _context.BankFiles.IgnoreQueryFilters().AsNoTracking()
                .Where(f => f.BankId == null && f.Status != BankFileStatuses.Respins
                            && (isAdmin || (profileId != null && f.BrokerProfileId == profileId)))
                .Select(f => f.Amount)
                .ToList();

            var result = new BankStatsResult
            {
                Month = label,
                HasBrokerProfile = profileId != null,
                ShowNetwork = showNetwork,
                Unattributed = new UnattributedFiles { Count = unattributed.Count, Amount = unattributed.Sum() },
            };
            foreach (var bank in banks)
            {
                var bankFiles = files.Where(f => f.BankId == bank.Id).ToList();
                var mine = new BankMineVolume
                {
                    CommissionPercent = commission.FallbackPercent(profileId, bank.Id),
                    NpPercent = commission.RateFor(profileId, bank.Id, CreditTypes.Np).Percent,
                    IpPercent = commission.RateFor(profileId, bank.Id, CreditTypes.Ip).Percent,
                };
                var mineFiles = bankFiles.Where(f => profileId != null && f.BrokerProfileId == profileId).ToList();
                Fill(mine, mineFiles.Select(f => (f.CreditType, f.Amount, f.Status)));
                mine.EstimatedCommission = mineFiles.Where(f => f.Status == BankFileStatuses.Disbursat)
                    .Sum(f => commission.Commission(profileId, bank.Id, f.CreditType, f.Amount));
                var all = new BankVolume();
                Fill(all, networkFiles.Where(f => f.BankId == bank.Id).Select(f => (f.CreditType, f.Amount, f.Status)));
                var network = new BankNetworkVolume { DisbursedAmount = all.DisbursedAmount };
                if (isAdmin)
                {
                    network.DisbursedCount = all.DisbursedCount;
                    network.NpAmount = all.NpAmount;
                    network.NpCount = all.NpCount;
                    network.IpAmount = all.IpAmount;
                    network.IpCount = all.IpCount;
                    network.UnknownAmount = all.UnknownAmount;
                    network.UnknownCount = all.UnknownCount;
                    network.InProgressAmount = all.InProgressAmount;
                    network.InProgressCount = all.InProgressCount;
                }
                result.Banks.Add(new BankStatsItem
                {
                    BankId = bank.Id,
                    Name = bank.Name,
                    Active = bank.Active,
                    Threshold = bank.MonthlyThresholdAmount,
                    Network = network,
                    Mine = mine,
                    Tiers = !showNetwork ? new List<BankTierStatus>()
                        : new[] { CreditTypes.Np, CreditTypes.Ip }.Select(t => commission.TierStatus(bank.Id, t)).OfType<BankTierStatus>().ToList(),
                });
            }

            if (isAdmin)
            {
                var names = _context.BrokerProfiles.AsNoTracking().Select(p => new { p.Id, p.DisplayName }).ToDictionary(p => p.Id, p => p.DisplayName);
                result.ByBroker = files
                    .Where(f => f.Status == BankFileStatuses.Disbursat)
                    .GroupBy(f => f.BrokerProfileId ?? 0)
                    .Select(g => new BrokerStatsItem
                    {
                        BrokerProfileId = g.Key,
                        BrokerName = g.Key == 0 ? "Fără broker" : names.TryGetValue(g.Key, out var n) ? n : $"Broker #{g.Key}",
                        DisbursedAmount = g.Sum(f => f.Amount),
                        DisbursedCount = g.Count(),
                        NpAmount = g.Where(f => f.CreditType == CreditTypes.Np).Sum(f => f.Amount),
                        NpCount = g.Count(f => f.CreditType == CreditTypes.Np),
                        IpAmount = g.Where(f => f.CreditType == CreditTypes.Ip).Sum(f => f.Amount),
                        IpCount = g.Count(f => f.CreditType == CreditTypes.Ip),
                    })
                    .OrderByDescending(b => b.DisbursedAmount).ThenBy(b => b.BrokerName)
                    .ToList();
            }
            return result;
        }

        public BankTiersResult? GetTiers(int bankId)
        {
            if (!_context.Banks.AsNoTracking().Any(b => b.Id == bankId)) return null;
            var rows = _context.BankCommissionTiers.AsNoTracking().Where(t => t.BankId == bankId).ToList();
            List<CommissionTierRow> Of(string type) => rows.Where(t => t.CreditType == type).OrderBy(t => t.FromAmount)
                .Select(t => new CommissionTierRow { From = t.FromAmount, To = t.ToAmount, Percent = t.Percent }).ToList();
            return new BankTiersResult { Np = Of(CreditTypes.Np), Ip = Of(CreditTypes.Ip) };
        }

        public List<CommissionTierRow>? SaveTiers(int bankId, string creditType, List<CommissionTierRow>? tiers)
        {
            if (!CreditTypes.IsValid(creditType)) throw new InvalidOperationException("Tipul de credit trebuie să fie NP sau IP.");
            var valid = CommissionTiers.Validate(tiers);
            if (!_context.Banks.AsNoTracking().Any(b => b.Id == bankId)) return null;
            var existing = _context.BankCommissionTiers.Where(t => t.BankId == bankId && t.CreditType == creditType).ToList();
            _context.BankCommissionTiers.RemoveRange(existing);
            _context.BankCommissionTiers.AddRange(valid.Select(t => new BankCommissionTier
            {
                BankId = bankId,
                CreditType = creditType,
                FromAmount = t.From,
                ToAmount = t.To,
                Percent = t.Percent,
            }));
            _context.SaveChanges();
            return valid;
        }

        private static void Fill(BankVolume volume, IEnumerable<(string? CreditType, decimal Amount, string Status)> files)
        {
            foreach (var (type, amount, status) in files)
            {
                if (status == BankFileStatuses.Disbursat)
                {
                    volume.DisbursedAmount += amount;
                    volume.DisbursedCount++;
                    if (type == CreditTypes.Np) { volume.NpAmount += amount; volume.NpCount++; }
                    else if (type == CreditTypes.Ip) { volume.IpAmount += amount; volume.IpCount++; }
                    else { volume.UnknownAmount += amount; volume.UnknownCount++; }
                }
                else
                {
                    volume.InProgressAmount += amount;
                    volume.InProgressCount++;
                }
            }
        }

        private int? ResolveProfileId(int userId)
        {
            if (_context.BrokerScopeId is > 0) return _context.BrokerScopeId;
            var id = _context.BrokerProfiles.AsNoTracking().Where(p => p.UserId == userId && p.Status == "Active")
                .Select(p => (int?)p.Id).FirstOrDefault();
            return id;
        }

        private (string Label, DateTime FromUtc, DateTime ToUtc) MonthRange(string? month)
        {
            var zone = _zone;
            int year, mon;
            if (string.IsNullOrWhiteSpace(month))
            {
                var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone);
                year = now.Year;
                mon = now.Month;
            }
            else if (!DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                throw new InvalidOperationException("Luna trebuie să fie în formatul AAAA-LL.");
            }
            else
            {
                year = parsed.Year;
                mon = parsed.Month;
                if (year < 2000 || year > 2100) throw new InvalidOperationException("Luna trebuie să fie între anii 2000 și 2100.");
            }
            var start = new DateTime(year, mon, 1, 0, 0, 0, DateTimeKind.Unspecified);
            var end = start.AddMonths(1);
            return ($"{year:D4}-{mon:D2}", TimeZoneInfo.ConvertTimeToUtc(start, zone), TimeZoneInfo.ConvertTimeToUtc(end, zone));
        }

        private void Apply(BankEntity bank, BankCatalogInput input, int? existingId)
        {
            var name = input.Name?.Trim();
            if (string.IsNullOrEmpty(name)) throw new InvalidOperationException("Scrie numele băncii.");
            if (name.Length > MaxName) throw new InvalidOperationException($"Numele băncii poate avea cel mult {MaxName} de caractere.");
            if (input.Active == null || input.CommissionPercent == null || input.SortOrder == null)
                throw new InvalidOperationException("Completează toate câmpurile băncii.");
            if (_context.Banks.AsNoTracking().AsEnumerable().Any(b => b.Id != existingId && string.Equals(b.Name.Trim(), name, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException("Există deja o bancă cu acest nume.");
            if (input.CommissionPercent < 0 || input.CommissionPercent > 100)
                throw new InvalidOperationException("Comisionul implicit trebuie să fie între 0 și 100%.");
            if (input.MonthlyThresholdAmount is < 0 or > 999_999_999_999m)
                throw new InvalidOperationException("Pragul lunar nu poate fi negativ.");
            bank.Name = name;
            bank.Active = input.Active.Value;
            bank.CommissionPercent = Math.Round(input.CommissionPercent.Value, 2);
            bank.MonthlyThresholdAmount = input.MonthlyThresholdAmount == null ? null : Math.Round(input.MonthlyThresholdAmount.Value, 2);
            bank.SortOrder = input.SortOrder.Value;
        }

        private static BankCatalogItem ToItem(BankEntity b) => new()
        {
            Id = b.Id,
            Name = b.Name,
            Active = b.Active,
            CommissionPercent = b.CommissionPercent,
            MonthlyThresholdAmount = b.MonthlyThresholdAmount,
            SortOrder = b.SortOrder,
        };
    }
}
