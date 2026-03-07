using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class Consent : IEntity
    {
        public Guid ConsentId { get; set; } = Guid.NewGuid();
        public int UserId { get; set; }
        public string ConsentType { get; set; } = null!; // TC_ACCEPT, GDPR_ACCEPT, MANDATE_ANAF_BC, COSTS_ACCEPT, SHARE_TO_BROKER
        public string Status { get; set; } = "granted"; // granted/revoked
        public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
        public DateTime? RevokedAt { get; set; }
        public Guid? DocId { get; set; } // Reference to legal_docs
        public string ConsentTextSnapshot { get; set; } = null!; // Full text at time of consent
        public Guid? SessionId { get; set; }
        public string? Ip { get; set; }
        public string? UserAgent { get; set; }
        public byte[]? DeviceHash { get; set; }
        public string SourceChannel { get; set; } = null!; // web/ios/android

        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
        public virtual LegalDoc? Doc { get; set; }
        public virtual Session? Session { get; set; }
    }
}


