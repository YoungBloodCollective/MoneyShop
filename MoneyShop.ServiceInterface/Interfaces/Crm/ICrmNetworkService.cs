using System.Collections.Generic;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// Aggregate numbers for the broker network, split by broker type (MoneyShop / Afiliat). Only
    /// amounts, counts, bank names and months are ever returned, never files, clients or broker names.
    /// </summary>
    public interface ICrmNetworkService
    {
        /// <summary>Super Admin dashboard. Throws when called with a broker scope.</summary>
        AdminDashboardResult GetAdminDashboard(int months, int? year, int? month);

        /// <summary>
        /// The MoneyShop network month mirror (one card per active catalog bank). Null when the caller is
        /// neither the Super Admin nor an active broker of type MoneyShop. Month defaults to the current one;
        /// future months are refused.
        /// </summary>
        NetworkMonthSummary? GetNetwork(int userId, bool isAdmin, int? year, int? month);
    }

    public class NetworkVolume
    {
        public decimal Amount { get; set; }
        public int Count { get; set; }
        public decimal NpAmount { get; set; }
        public int NpCount { get; set; }
        public decimal IpAmount { get; set; }
        public int IpCount { get; set; }
    }

    public class NetworkMonthPoint
    {
        public string Month { get; set; } = null!;
        public decimal Amount { get; set; }
        public int Count { get; set; }
    }

    public class NetworkBankPoint : NetworkVolume
    {
        public int? BankId { get; set; }
        public string BankName { get; set; } = null!;
    }

    public class NetworkMonthSummary
    {
        public string Month { get; set; } = null!;
        public NetworkVolume Total { get; set; } = new();
        public List<NetworkBankPoint> Banks { get; set; } = new();
    }

    public class NetworkSection
    {
        public string Type { get; set; } = null!;
        public int ActiveBrokers { get; set; }
        public NetworkMonthSummary Selected { get; set; } = new();
        public List<NetworkMonthPoint> Series { get; set; } = new();
        public decimal? EstimatedCommission { get; set; }
    }

    public class AdminDashboardResult
    {
        public string CurrentMonth { get; set; } = null!;
        public string SelectedMonth { get; set; } = null!;
        public NetworkSection MoneyShop { get; set; } = new();
        public NetworkSection Affiliates { get; set; } = new();
    }
}
