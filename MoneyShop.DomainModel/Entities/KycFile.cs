using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class KycFile : IEntity
    {
        public Guid FileId { get; set; } = Guid.NewGuid();
        public Guid KycId { get; set; }
        public string FileType { get; set; } = null!; // selfie, id_front, id_back, proof_of_address
        public string? BlobPath { get; set; } // Path in Azure Blob Storage (deprecated, kept for backward compatibility)
        public string FileName { get; set; } = null!;
        public string MimeType { get; set; } = null!;
        public long FileSize { get; set; }
        public byte[]? Sha256Hash { get; set; }
        public string? FileContentBase64 { get; set; } // Base64 encoded file content stored in database
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } // CreatedAt + 30 days
        public DateTime? DeletedAt { get; set; } // When file was deleted

        // Navigation
        public virtual KycSession KycSession { get; set; } = null!;
    }
}

