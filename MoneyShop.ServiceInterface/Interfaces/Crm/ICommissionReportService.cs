using System;
using System.Collections.Generic;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// The monthly commission report of one broker: every file disbursed in the month with the applied
    /// percent and commission. A broker only ever gets their own; the Super Admin picks the broker.
    /// Validation failures throw <see cref="InvalidOperationException"/>; asking for another broker's report throws
    /// <see cref="UnauthorizedAccessException"/>.
    /// </summary>
    public interface ICommissionReportService
    {
        CommissionReport Build(int userId, bool isAdmin, string? month, int? brokerId);
        CommissionReportFile Generate(int userId, bool isAdmin, string? month, int? brokerId, string format);
    }

    public class CommissionReportRow
    {
        /// <summary>The disbursement date in Romania time.</summary>
        public DateTime Date { get; set; }
        public string ClientName { get; set; } = null!;
        public string BankName { get; set; } = null!;
        public string? CreditType { get; set; }
        public decimal Amount { get; set; }
        public decimal Percent { get; set; }
        public decimal Commission { get; set; }
    }

    public class CommissionReportBank
    {
        public string BankName { get; set; } = null!;
        public int Count { get; set; }
        public decimal Amount { get; set; }
        public decimal Commission { get; set; }
        public List<CommissionReportRow> Rows { get; set; } = new();
    }

    public class CommissionReport
    {
        public string Month { get; set; } = null!;
        public int BrokerProfileId { get; set; }
        public string BrokerName { get; set; } = null!;
        public string BrokerSlug { get; set; } = null!;
        public string? FirmName { get; set; }
        public List<CommissionReportBank> Banks { get; set; } = new();
        public int Count { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalCommission { get; set; }
    }

    public class CommissionReportFile
    {
        public byte[] Content { get; set; } = Array.Empty<byte>();
        public string ContentType { get; set; } = null!;
        public string FileName { get; set; } = null!;
    }
}
