using System;
using System.Collections.Generic;

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
    }

    public class CrmFileListItem
    {
        public int Id { get; set; }
        public string Code { get; set; } = null!;
        public int UserId { get; set; }
        public string ClientName { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string? TypeCredit { get; set; }
        public decimal? RequestedAmount { get; set; }
        public decimal? SumaAprobata { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
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

        public CrmFinancialSnapshot? Financial { get; set; }
        public List<CrmClientFile> Files { get; set; } = new();
        public List<CrmClientDocument> Documents { get; set; } = new();
        public CrmKycSnapshot? Kyc { get; set; }
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
}
