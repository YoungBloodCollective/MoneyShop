using System;
using System.Collections.Generic;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using MoneyShop.ServiceInterface.Interfaces.Subject;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// Read models for the broker CRM lists and the client 360 view. Everything is read through
    /// the broker scope (the application repository carries the broker filter); related rows are
    /// bound to that scope by the broker's own application and user ids.
    /// </summary>
    public interface ICrmService
    {
        List<CrmClientListItem> GetClients();
        CrmClientDetail? GetClient(int userId);
        List<CrmOfferItem> GetOffers();
        List<CrmFileListItem> GetFiles();

        /// <summary>The client's ANAF income document (Situația Înscrierii), stored in the
        /// acord's file store. Null when the client has none.</summary>
        CrmAnafFile? GetClientAnaf(int userId);

        /// <summary>Stores an ANAF income document for the client, reusing the acord KYC file
        /// store. Fails (Ok=false) when the client has no acord/KYC session to attach it to.</summary>
        CrmAnafUploadResult UploadClientAnaf(int userId, byte[] content, string fileName, string mimeType);

        CrmBcReportPdf? GetClientBcReportPdf(int userId, int reportId, CnpAccessContext access);

        /// <summary>True when the signed-in broker (or Super Admin) can see this client: the
        /// client has an acord or a file in their scope.</summary>
        bool IsClientVisible(int userId);

        /// <summary>Saves the income the broker read off the client's ANAF document and
        /// recomputes the debt-to-income ratio against the latest BC report.</summary>
        CrmIncomeSnapshot SaveClientIncome(int userId, CrmIncomeInput input);
    }

    /// <summary>A bank file as a row of the Dosare list.</summary>
    public class CrmFileListItem
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public int UserId { get; set; }
        public string ClientName { get; set; } = null!;
        public int? BankId { get; set; }
        public string BankName { get; set; } = null!;
        public string? CreditType { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = null!;
        public DateTime StatusChangedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        /// <summary>Only for the Super Admin, who sees every broker's files.</summary>
        public string? BrokerName { get; set; }
    }

    public class CrmClientListItem
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = null!;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public int FilesCount { get; set; }
        public string? LastStatus { get; set; }
        public DateTime LastActivityAt { get; set; }
        public decimal ApprovedVolume { get; set; }
        public bool HasAcord { get; set; }
        public Guid? AcordId { get; set; }
        public string? AcordStatus { get; set; }
        public DateTime? AcordSignedAt { get; set; }
        public DateTime? AcordCreatedAt { get; set; }
        /// <summary>The broker's labels on the client (PROBLEME_BC, DE_REVENIT, DTI).</summary>
        public List<string> Tags { get; set; } = new();
        /// <summary>Stage of the client's most recently changed bank file, if any.</summary>
        public string? BankFileStatus { get; set; }
    }

    public class CrmClientDetail
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = null!;
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public DateTime? BirthDate { get; set; }
        public bool PhoneVerified { get; set; }
        public bool EmailVerified { get; set; }
        public Guid? AcordId { get; set; }
        public string? AcordStatus { get; set; }
        public DateTime? AcordSignedAt { get; set; }
        public DateTime? AcordCreatedAt { get; set; }

        public CrmFinancialSnapshot? Financial { get; set; }
        public List<CrmClientFile> Files { get; set; } = new();
        public List<CrmClientDocument> Documents { get; set; } = new();
        public CrmKycSnapshot? Kyc { get; set; }
        public CrmAcordSnapshot? Acord { get; set; }
        public CrmBcReportSnapshot? BcReport { get; set; }

        /// <summary>True when the client has an acord/KYC session an ANAF doc can attach to.</summary>
        public bool CanAttachAnaf { get; set; }
        public string? AnafFileName { get; set; }
        public DateTime? AnafUploadedAt { get; set; }

        /// <summary>Income the broker entered from the client's ANAF document (last 3 months).</summary>
        public CrmIncomeSnapshot? Income { get; set; }
    }

    /// <summary>Net income for the last 3 months, read by the broker off the ANAF document.</summary>
    public class CrmIncomeInput
    {
        public decimal? Salariu1 { get; set; }
        public decimal? Salariu2 { get; set; }
        public decimal? Salariu3 { get; set; }
        /// <summary>Monthly meal-ticket value; 0 or null when the client receives none.</summary>
        public decimal? BonuriMasa { get; set; }
    }

    public class CrmIncomeSnapshot
    {
        public decimal? Salariu1 { get; set; }
        public decimal? Salariu2 { get; set; }
        public decimal? Salariu3 { get; set; }
        /// <summary>Average of the salaries entered.</summary>
        public decimal? SalariuNet { get; set; }
        public decimal? BonuriMasa { get; set; }
        /// <summary>SalariuNet + meal tickets.</summary>
        public decimal? VenitTotal { get; set; }
        /// <summary>Monthly instalments from the latest BC report, when there is one.</summary>
        public decimal? RataTotalaLunara { get; set; }
        /// <summary>RataTotalaLunara / VenitTotal (0.35 = 35%).</summary>
        public decimal? Dti { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CrmFinancialSnapshot
    {
        public decimal? SalariuNet { get; set; }
        public int? VechimeLuni { get; set; }
        public int? NrCrediteBanci { get; set; }
        public decimal? SoldTotal { get; set; }
        public decimal? Dti { get; set; }
        public decimal? Scoring { get; set; }
        public string? RecommendedLevel { get; set; }
    }

    public class CrmClientFile
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string? TypeCredit { get; set; }
        public decimal? RequestedAmount { get; set; }
        public int? RequestedTermMonths { get; set; }
        public decimal? SumaAprobata { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CrmClientDocument
    {
        public int Id { get; set; }
        public string DocType { get; set; } = null!;
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CrmKycSnapshot
    {
        public string Status { get; set; } = null!;
        public bool HasIdFront { get; set; }
        public bool HasIdBack { get; set; }
        public bool HasSelfie { get; set; }
        public bool HasProofOfAddress { get; set; }
        public bool? LivenessPassed { get; set; }
        public bool? FaceMatchPassed { get; set; }
    }

    public class CrmOfferItem
    {
        public int ApplicationId { get; set; }
        public string FileCode { get; set; } = null!;
        public string ClientName { get; set; } = null!;
        public string BankName { get; set; } = null!;
        public decimal CommissionPercent { get; set; }
        public decimal? RequestedAmount { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }

    public class CrmAnafFile
    {
        public byte[] Content { get; set; } = null!;
        public string FileName { get; set; } = null!;
        public string MimeType { get; set; } = null!;
    }

    public class CrmAnafUploadResult
    {
        public bool Ok { get; set; }
        /// <summary>When Ok is false: "no_acord" (no KYC session to attach to).</summary>
        public string? Reason { get; set; }
    }

    public class CrmAcordSnapshot
    {
        public Guid AcordId { get; set; }
        public string Nume { get; set; } = null!;
        public string Prenume { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime? SignedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string? TipAct { get; set; }
        public bool? MarketingAccepted { get; set; }
        public bool? Oug52Waived { get; set; }
        public string? ReviewNote { get; set; }
        public string? CnpMasked { get; set; }
        public bool CnpAvailable { get; set; }
        public string? Address { get; set; }
        public bool? LivenessPassed { get; set; }
        public bool? FaceMatchPassed { get; set; }
        public bool AutomaticChecksRan { get; set; }
        public AcordOcrSnapshot? Ocr { get; set; }
        public List<AcordFileInfo> Files { get; set; } = new();
        public List<BankConsentInfo> BankConsents { get; set; } = new();
    }

    public class CrmBcReportSnapshot
    {
        public int Id { get; set; }
        public string? FileName { get; set; }
        public DateTime UploadedAt { get; set; }
        public string? ReportDate { get; set; }
        public int? FicoScore { get; set; }
        public decimal? ExistingMonthlyObligations { get; set; }
        /// <summary>Monthly instalments to banks / to non-bank lenders (IFN).</summary>
        public decimal BankMonthlyPayment { get; set; }
        public decimal NonBankMonthlyPayment { get; set; }
        /// <summary>Outstanding balance owed to banks / to non-bank lenders (IFN).</summary>
        public decimal BankAmountOwed { get; set; }
        public decimal NonBankAmountOwed { get; set; }
        public int TotalAccounts { get; set; }
        public int ActiveAccounts { get; set; }
        public int AccountsWithArrears { get; set; }
        public decimal TotalAmountOwed { get; set; }
        public decimal TotalArrears { get; set; }
        public string? MaxCurrentDelay { get; set; }
        public int InquiriesCount { get; set; }
        public int? Dpd30Count { get; set; }
        public int? Dpd60Count { get; set; }
        public int? Dpd90PlusCount { get; set; }
        public int? NonbankActiveNow { get; set; }
        public bool HasPdf { get; set; }
        public List<string> ParseWarnings { get; set; } = new();
        public List<CrmBcAccount> Accounts { get; set; } = new();
    }

    public class CrmBcAccount
    {
        public string? Creditor { get; set; }
        public string? AccountType { get; set; }
        public string? Status { get; set; }
        public string? Currency { get; set; }
        public decimal CurrentBalance { get; set; }
        public decimal ArrearsAmount { get; set; }
        public int DaysOverdue { get; set; }
        public bool IsActive { get; set; }
    }

    public class CrmBcReportPdf
    {
        public int ReportId { get; set; }
        public byte[] Content { get; set; } = null!;
        public string FileName { get; set; } = null!;
    }
}
