using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class LegalDoc : IEntity
    {
        public Guid DocId { get; set; } = Guid.NewGuid();
        public string DocType { get; set; } = null!; // TC, GDPR, COOKIES, MANDATE, BROKER_TRANSFER
        public string Version { get; set; } = null!;
        public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
        public byte[] ContentHash { get; set; } = null!; // SHA-256 hash of content
        public bool IsActive { get; set; } = true;

        // Navigation
        public virtual ICollection<Consent> Consents { get; set; } = new List<Consent>();
    }
}


