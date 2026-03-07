using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class KycSession : IEntity
    {
        public Guid KycId { get; set; } = Guid.NewGuid();
        public int UserId { get; set; }
        public string KycType { get; set; } = "USER_KYC"; // USER_KYC, BROKER_KYC
        public string Status { get; set; } = "pending"; // pending, verified, rejected, expired
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? VerifiedAt { get; set; }
        public DateTime? ExpiresAt { get; set; } // CreatedAt + 30 days
        public string? ProviderTransactionId { get; set; } // External SRV.KYC session ID
        public string? Token { get; set; } // External SRV.KYC session token
        public string? RejectionReason { get; set; }
        
        // KYC Form Data
        public string? Cnp { get; set; } // CNP (hashed)
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? County { get; set; }
        public string? PostalCode { get; set; }

        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
        public virtual ICollection<KycFile> KycFiles { get; set; } = new List<KycFile>();
    }
}

