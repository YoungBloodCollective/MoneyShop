using System;
using System.Collections.Generic;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// The bank catalog the Super Admin keeps (names, default commission, monthly threshold), the
    /// commission each broker negotiated per bank, and the monthly disbursement numbers per bank.
    /// Validation failures throw <see cref="InvalidOperationException"/> with a Romanian message.
    /// </summary>
    public interface IBankCatalogService
    {
        List<BankCatalogItem> GetAllBanks();
        List<BankCatalogItem> GetActiveBanks();
        BankCatalogItem CreateBank(BankCatalogInput input);
        /// <summary>Null when the bank does not exist.</summary>
        BankCatalogItem? UpdateBank(int bankId, BankCatalogInput input);

        List<BrokerCommissionItem> GetMyCommissions(int userId);
        /// <summary>Sets the caller's percent for a bank; a null percent removes the override. Null when the bank is not an active catalog bank.</summary>
        BrokerCommissionItem? SetMyCommission(int userId, int bankId, decimal? percent);

        /// <summary>
        /// Per bank, the network disbursed amount and the caller's own numbers for a month (yyyy-MM, Europe/Bucharest).
        /// Only an admin also gets the network counts, NP/IP split, in-progress numbers and the per-broker breakdown.
        /// </summary>
        BankStatsResult GetStats(int userId, string? month, bool isAdmin);

        /// <summary>The commission tiers of a bank for NP and IP. Null when the bank does not exist.</summary>
        BankTiersResult? GetTiers(int bankId);
        /// <summary>Replaces the tiers of a bank and credit type after validating them. Null when the bank does not exist.</summary>
        List<CommissionTierRow>? SaveTiers(int bankId, string creditType, List<CommissionTierRow>? tiers);
    }

    public static class CreditTypes
    {
        public const string Np = "NP";
        public const string Ip = "IP";

        public static bool IsValid(string? type) => type == Np || type == Ip;
    }

    public class BankCatalogInput
    {
        public string? Name { get; set; }
        public bool? Active { get; set; }
        public decimal? CommissionPercent { get; set; }
        /// <summary>Null means no threshold.</summary>
        public decimal? MonthlyThresholdAmount { get; set; }
        public int? SortOrder { get; set; }
    }

    public class BankCatalogItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public bool Active { get; set; }
        public decimal CommissionPercent { get; set; }
        public decimal? MonthlyThresholdAmount { get; set; }
        public int SortOrder { get; set; }
    }

    public class BrokerCommissionItem
    {
        public int BankId { get; set; }
        public string Name { get; set; } = null!;
        public decimal DefaultPercent { get; set; }
        public decimal? MyPercent { get; set; }
    }

    public class BankVolume
    {
        public decimal DisbursedAmount { get; set; }
        public int DisbursedCount { get; set; }
        public decimal NpAmount { get; set; }
        public int NpCount { get; set; }
        public decimal IpAmount { get; set; }
        public int IpCount { get; set; }
        public decimal UnknownAmount { get; set; }
        public int UnknownCount { get; set; }
        public decimal InProgressAmount { get; set; }
        public int InProgressCount { get; set; }
    }

    /// <summary>Network numbers for a bank. Brokers only get the disbursed amount; every other field is null.</summary>
    public class BankNetworkVolume
    {
        public decimal DisbursedAmount { get; set; }
        public int? DisbursedCount { get; set; }
        public decimal? NpAmount { get; set; }
        public int? NpCount { get; set; }
        public decimal? IpAmount { get; set; }
        public int? IpCount { get; set; }
        public decimal? UnknownAmount { get; set; }
        public int? UnknownCount { get; set; }
        public decimal? InProgressAmount { get; set; }
        public int? InProgressCount { get; set; }
    }

    public class BankMineVolume : BankVolume
    {
        /// <summary>The fallback percent (own override, else the bank default), used without tiers.</summary>
        public decimal CommissionPercent { get; set; }
        /// <summary>The percent that applies to a new NP / IP file this month, tier-based when the bank has tiers.</summary>
        public decimal NpPercent { get; set; }
        public decimal IpPercent { get; set; }
        public decimal EstimatedCommission { get; set; }
    }

    public class BankStatsItem
    {
        public int BankId { get; set; }
        public string Name { get; set; } = null!;
        /// <summary>False for a deactivated bank that still has files, kept so history does not change.</summary>
        public bool Active { get; set; } = true;
        public decimal? Threshold { get; set; }
        public BankNetworkVolume Network { get; set; } = new();
        public BankMineVolume Mine { get; set; } = new();
        /// <summary>Tier progress per credit type for banks that have tiers; empty for affiliates.</summary>
        public List<BankTierStatus> Tiers { get; set; } = new();
    }

    public class BrokerStatsItem
    {
        public int BrokerProfileId { get; set; }
        public string BrokerName { get; set; } = null!;
        public decimal DisbursedAmount { get; set; }
        public int DisbursedCount { get; set; }
        public decimal NpAmount { get; set; }
        public int NpCount { get; set; }
        public decimal IpAmount { get; set; }
        public int IpCount { get; set; }
    }

    public class UnattributedFiles
    {
        public int Count { get; set; }
        public decimal Amount { get; set; }
    }

    public class BankStatsResult
    {
        public UnattributedFiles Unattributed { get; set; } = new();
        public string Month { get; set; } = null!;
        public bool HasBrokerProfile { get; set; }
        /// <summary>False for affiliated brokers: the network figures are for the Super Admin and MoneyShop brokers only.</summary>
        public bool ShowNetwork { get; set; }
        public List<BankStatsItem> Banks { get; set; } = new();
        public List<BrokerStatsItem>? ByBroker { get; set; }
    }
}
