using System;
using System.Collections.Generic;
using System.Linq;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// The one place that decides which commission percent applies to a disbursed bank file. For a month,
    /// a bank and a credit type the MoneyShop network volume picks the tier, whose percent applies to the
    /// whole amount of every MoneyShop broker's file. Without tiers, without a credit type or for an
    /// affiliate the per-broker override for that credit type (else the bank default) applies; a file
    /// without a credit type uses the broker's NP percent.
    /// </summary>
    public interface ICommissionCalculator
    {
        /// <summary>Loads the tiers, the network volume and the percents for a month (yyyy-MM, Europe/Bucharest).</summary>
        CommissionMonth ForMonth(string month);
        CommissionMonth ForRange(DateTime fromUtc, DateTime toUtc);
    }

    public class CommissionTierRow
    {
        public decimal From { get; set; }
        /// <summary>Null means no upper limit.</summary>
        public decimal? To { get; set; }
        public decimal Percent { get; set; }
    }

    public class BankTiersResult
    {
        public List<CommissionTierRow> Np { get; set; } = new();
        public List<CommissionTierRow> Ip { get; set; } = new();
    }

    public class BankTierInput
    {
        public List<CommissionTierRow>? Tiers { get; set; }
    }

    /// <summary>Where the network stands for a bank and credit type that has tiers.</summary>
    public class BankTierStatus
    {
        public string CreditType { get; set; } = null!;
        public decimal NetworkAmount { get; set; }
        public decimal? CurrentPercent { get; set; }
        public decimal? CurrentFrom { get; set; }
        public decimal? CurrentTo { get; set; }
        public decimal? NextPercent { get; set; }
        public decimal? NextFrom { get; set; }
        public decimal? RemainingToNext { get; set; }
    }

    public readonly record struct CommissionRate(decimal Percent, bool FromTier);

    public static class CommissionTiers
    {
        public const int MaxTiers = 20;
        private const decimal MaxAmount = 999_999_999_999m;

        /// <summary>The tier with From ≤ volume &lt; To (To null = no limit), or null.</summary>
        public static CommissionTierRow? Resolve(IReadOnlyList<CommissionTierRow> tiers, decimal volume) =>
            tiers.OrderBy(t => t.From).FirstOrDefault(t => t.From <= volume && (t.To == null || volume < t.To));

        /// <summary>The first tier that starts above the volume, or null at the top.</summary>
        public static CommissionTierRow? Next(IReadOnlyList<CommissionTierRow> tiers, decimal volume) =>
            tiers.OrderBy(t => t.From).FirstOrDefault(t => t.From > volume);

        public static BankTierStatus Status(string creditType, IReadOnlyList<CommissionTierRow> tiers, decimal volume)
        {
            var current = Resolve(tiers, volume);
            var next = Next(tiers, volume);
            return new BankTierStatus
            {
                CreditType = creditType,
                NetworkAmount = volume,
                CurrentPercent = current?.Percent,
                CurrentFrom = current?.From,
                CurrentTo = current?.To,
                NextPercent = next?.Percent,
                NextFrom = next?.From,
                RemainingToNext = next == null ? null : next.From - volume,
            };
        }

        /// <summary>Returns the tiers sorted and rounded to two decimals; throws a Romanian message when they are not valid.</summary>
        public static List<CommissionTierRow> Validate(IReadOnlyList<CommissionTierRow>? input)
        {
            if (input == null) throw new InvalidOperationException("Trimite lista de praguri.");
            if (input.Count > MaxTiers) throw new InvalidOperationException($"Poți defini cel mult {MaxTiers} de praguri.");
            var rows = input.Select(t => new CommissionTierRow
            {
                From = Math.Round(t.From, 2),
                To = t.To == null ? null : Math.Round(t.To.Value, 2),
                Percent = Math.Round(t.Percent, 2),
            }).OrderBy(t => t.From).ThenBy(t => t.To ?? decimal.MaxValue).ToList();
            for (var i = 0; i < rows.Count; i++)
            {
                var t = rows[i];
                var n = i + 1;
                if (t.From < 0 || t.From > MaxAmount) throw new InvalidOperationException($"Pragul {n}: valoarea de început nu este validă.");
                if (t.To != null && (t.To > MaxAmount || t.To <= t.From))
                    throw new InvalidOperationException($"Pragul {n}: valoarea de final trebuie să fie mai mare decât cea de început.");
                if (t.Percent < 0 || t.Percent > 100) throw new InvalidOperationException($"Pragul {n}: comisionul trebuie să fie între 0 și 100%.");
                if (i > 0)
                {
                    var prev = rows[i - 1];
                    if (prev.To == null) throw new InvalidOperationException($"Pragul {i}: doar ultimul prag poate fi fără limită superioară.");
                    if (t.From < prev.To) throw new InvalidOperationException($"Pragurile {i} și {n} se suprapun.");
                }
            }
            return rows;
        }
    }

    /// <summary>The commission state of one month: tiers, MoneyShop network volume per bank and credit type, and the fallback percents.</summary>
    public class CommissionMonth
    {
        private readonly Dictionary<(int BankId, string Type), List<CommissionTierRow>> _tiers;
        private readonly Dictionary<(int BankId, string Type), decimal> _volume;
        private readonly HashSet<int> _moneyShopBrokers;
        private readonly Dictionary<(int BrokerId, int BankId, string Type), decimal> _overrides;
        private readonly Dictionary<int, decimal> _defaults;

        public CommissionMonth(
            Dictionary<(int BankId, string Type), List<CommissionTierRow>> tiers,
            Dictionary<(int BankId, string Type), decimal> networkVolume,
            HashSet<int> moneyShopBrokers,
            Dictionary<(int BrokerId, int BankId, string Type), decimal> brokerOverrides,
            Dictionary<int, decimal> bankDefaults)
        {
            _tiers = tiers;
            _volume = networkVolume;
            _moneyShopBrokers = moneyShopBrokers;
            _overrides = brokerOverrides;
            _defaults = bankDefaults;
        }

        public bool HasTiers(int bankId, string creditType) => _tiers.ContainsKey((bankId, creditType));

        public decimal NetworkVolume(int bankId, string creditType) => _volume.TryGetValue((bankId, creditType), out var v) ? v : 0m;

        public BankTierStatus? TierStatus(int bankId, string creditType) =>
            _tiers.TryGetValue((bankId, creditType), out var tiers) ? CommissionTiers.Status(creditType, tiers, NetworkVolume(bankId, creditType)) : null;

        public CommissionRate RateFor(int? brokerProfileId, int bankId, string? creditType)
        {
            if (brokerProfileId is { } broker && _moneyShopBrokers.Contains(broker) && creditType != null
                && _tiers.TryGetValue((bankId, creditType), out var tiers))
            {
                var tier = CommissionTiers.Resolve(tiers, NetworkVolume(bankId, creditType));
                if (tier != null) return new CommissionRate(tier.Percent, true);
            }
            return new CommissionRate(FallbackPercent(brokerProfileId, bankId, creditType), false);
        }

        public decimal FallbackPercent(int? brokerProfileId, int bankId, string? creditType)
        {
            if (brokerProfileId is { } broker && _overrides.TryGetValue((broker, bankId, creditType ?? CreditTypes.Np), out var o)) return o;
            return _defaults.TryGetValue(bankId, out var d) ? d : 0m;
        }

        public decimal Commission(int? brokerProfileId, int bankId, string? creditType, decimal amount) =>
            Math.Round(amount * RateFor(brokerProfileId, bankId, creditType).Percent / 100m, 2, MidpointRounding.AwayFromZero);
    }
}
