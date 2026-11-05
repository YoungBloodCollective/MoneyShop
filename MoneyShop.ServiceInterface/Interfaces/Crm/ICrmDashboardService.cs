using System;
using System.Collections.Generic;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// The broker's business overview for the CRM dashboard. Everything here is read from the
    /// broker's own records (loan files, clients) through the standard broker scope.
    /// </summary>
    public interface ICrmDashboardService
    {
        CrmDashboardSummary GetSummary();
    }

    public class CrmDashboardSummary
    {
        public int ActiveClients { get; set; }
        public int ActiveClientsDeltaPct { get; set; }
        public int FilesInProgress { get; set; }
        public int ApprovedThisMonth { get; set; }
        public decimal CreditVolume { get; set; }

        /// <summary>Slices for the status doughnut, in display order.</summary>
        public List<CrmStatusSlice> StatusBreakdown { get; set; } = new();

        /// <summary>One point per day for the last 30 days, oldest first.</summary>
        public List<CrmDayCount> Evolution { get; set; } = new();

        public List<CrmActivity> RecentActivities { get; set; } = new();
        public List<CrmTask> Tasks { get; set; } = new();
    }

    public class CrmStatusSlice
    {
        public string Key { get; set; } = null!;
        public string Label { get; set; } = null!;
        public int Count { get; set; }
    }

    public class CrmDayCount
    {
        public DateTime Date { get; set; }
        public int Count { get; set; }
    }

    public class CrmActivity
    {
        public string Title { get; set; } = null!;
        public DateTime At { get; set; }
        public string Kind { get; set; } = null!; // acord | dosar | oferta | document
    }

    public class CrmTask
    {
        public string Label { get; set; } = null!;
        public int Count { get; set; }
        public string Severity { get; set; } = "info"; // info | warning | danger
    }
}
