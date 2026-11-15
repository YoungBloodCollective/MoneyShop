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

        /// <summary>The client's ANAF income document (Situația Înscrierii), stored in the
        /// acord's file store. Null when the client has none.</summary>
        CrmAnafFile? GetClientAnaf(int userId);

        /// <summary>Stores an ANAF income document for the client, reusing the acord KYC file
        /// store. Fails (Ok=false) when the client has no acord/KYC session to attach it to.</summary>
        CrmAnafUploadResult UploadClientAnaf(int userId, byte[] content, string fileName, string mimeType);
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
        public bool HasAcord { get; set; }
        public Guid? AcordId { get; set; }
        public string? AcordStatus { get; set; }
        public DateTime? AcordSignedAt { get; set; }
        public DateTime? AcordCreatedAt { get; set; }
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

        /// <summary>True when the client has an acord/KYC session an ANAF doc can attach to.</summary>
        public bool CanAttachAnaf { get; set; }
        public string? AnafFileName { get; set; }
        public DateTime? AnafUploadedAt { get; set; }
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
}
