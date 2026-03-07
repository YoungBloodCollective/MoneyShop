namespace MoneyShop.ServiceInterface.Interfaces.Kyc
{
    public interface IKycService
    {
        KycSessionResult StartKycSession(int userId, string kycType = "USER_KYC");
        KycFileResult AddKycFile(Guid kycId, int userId, string fileType, string? blobPath, string fileName, string mimeType, long fileSize, byte[] fileContent);
        KycStatusResult? GetKycStatus(int userId, string kycType = "USER_KYC");
        bool UpdateKycFormData(Guid kycId, int userId, string? cnp, string? address, string? city, string? county, string? postalCode);
        bool UpdateKycStatus(Guid kycId, string status, string? rejectionReason = null, string? providerTransactionId = null);
        List<KycPendingResult> GetAllPendingKyc();
        KycDetailsResult? GetKycDetails(Guid kycId);
        KycFileDetail? GetKycFile(Guid fileId);
        int MarkExpiredFilesForDeletion();
    }

    public class KycSessionResult
    {
        public Guid KycId { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class KycFileResult
    {
        public Guid FileId { get; set; }
        public string FileType { get; set; } = null!;
        public string BlobPath { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class KycStatusResult
    {
        public Guid KycId { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime? VerifiedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string? RejectionReason { get; set; }
        public List<KycFileInfo> Files { get; set; } = new List<KycFileInfo>();
    }

    public class KycFileInfo
    {
        public Guid FileId { get; set; }
        public string FileType { get; set; } = null!;
        public string FileName { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }

    public class KycPendingResult
    {
        public Guid KycId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = null!;
        public string UserEmail { get; set; } = null!;
        public string KycType { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int FileCount { get; set; }
    }

    public class KycDetailsResult
    {
        public Guid KycId { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = null!;
        public string UserEmail { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string? RejectionReason { get; set; }
        public List<KycFileDetail> Files { get; set; } = new List<KycFileDetail>();
        public string? Cnp { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? County { get; set; }
        public string? PostalCode { get; set; }
    }

    public class KycFileDetail
    {
        public Guid FileId { get; set; }
        public string FileType { get; set; } = null!;
        public string FileName { get; set; } = null!;
        public string? BlobPath { get; set; }
        public string? FileContentBase64 { get; set; }
        public string MimeType { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }
}
