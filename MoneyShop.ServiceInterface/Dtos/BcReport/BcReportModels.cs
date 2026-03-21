namespace MoneyShop.ServiceInterface.Dtos.BcReport;

// ── Parsed data model (stored as JSON in BcReport.ParsedDataJson) ──

public class BcParsedData
{
    public int? FicoScore { get; set; }
    public List<string> FicoExplanationCodes { get; set; } = new();
    public string? SubjectName { get; set; }
    public string? SubjectCnp { get; set; }
    public string? ReportDate { get; set; }

    public BcIndicators? BankingIndicators { get; set; }
    public BcIndicators? NonBankingIndicators { get; set; }

    public List<BcAccountSummary> Accounts { get; set; } = new();
    public List<BcInquiry> Inquiries { get; set; } = new();
}

public class BcIndicators
{
    public string? AccountsInfo { get; set; }       // e.g. "9/2"
    public int TotalAccounts { get; set; }
    public int Participants { get; set; }
    public int AccountsWithArrears { get; set; }
    public string? OldestInfo { get; set; }
    public int OffBalanceSheet { get; set; }
    public int SentToCollection { get; set; }
    public decimal TotalMonthlyPayment { get; set; }
    public decimal TotalAmountOwed { get; set; }
    public decimal AmountOwedUnder1Year { get; set; }
    public decimal AmountOwed1To5Years { get; set; }
    public decimal AmountOwedOver5Years { get; set; }
    public decimal TotalArrears { get; set; }
    public string? MaxCurrentDelay { get; set; }     // e.g. "0 zile" or "104 zile"
    public int ContractsLast24Months { get; set; }
    public int ClosedLast24Months { get; set; }
    public int ClosedOnTime { get; set; }
    public int ClosedEarly { get; set; }
    public int ClosedOther { get; set; }
    public decimal MaxPaidInMonth24 { get; set; }

    // Last 6 months activity
    public int AccountsWithArrearsLast6M { get; set; }
    public int AccountsUpdatedLast6M { get; set; }
    public string? MostRecentInquiry { get; set; }
}

public class BcAccountSummary
{
    public int AccountIndex { get; set; }            // "Cont 1", "Cont 2", etc.
    public string? AccountType { get; set; }         // "Credit de consum", "Linie de credit", etc.
    public string? Status { get; set; }              // "Cont fara restante", "Cont platit sau închis/sold zero", etc.
    public string? Currency { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal CurrentBalance { get; set; }
    public decimal ArrearsAmount { get; set; }
    public string? LastUpdateDate { get; set; }
    public string? Creditor { get; set; }            // Participant name
    public int DaysOverdue { get; set; }
    public bool IsActive { get; set; }
    public bool HasArrears { get; set; }
}

public class BcInquiry
{
    public string? Date { get; set; }
    public string? Institution { get; set; }
    public string? Purpose { get; set; }
}

// ── API response DTOs ──

public class BcReportUploadResult
{
    public int ReportId { get; set; }
    public int? FicoScore { get; set; }
    public int TotalAccounts { get; set; }
    public int ActiveAccounts { get; set; }
    public int AccountsWithArrears { get; set; }
    public decimal TotalMonthlyObligations { get; set; }
    public decimal TotalAmountOwed { get; set; }
    public decimal TotalArrears { get; set; }
    public List<string> ParseWarnings { get; set; } = new();
    public BcParsedData? ParsedData { get; set; }
}

public class BcReportSummaryDto
{
    public int Id { get; set; }
    public int? FicoScore { get; set; }
    public decimal? ExistingMonthlyObligations { get; set; }
    public int? Dpd30Count { get; set; }
    public int? Dpd60Count { get; set; }
    public int? Dpd90PlusCount { get; set; }
    public int? NonbankClosedLast4Years { get; set; }
    public int? NonbankActiveNow { get; set; }
    public string? FileName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ParsedAt { get; set; }
    public BcParsedData? ParsedData { get; set; }
    public List<string> ParseWarnings { get; set; } = new();
}
