using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class Mandate : IEntity
    {
        public Guid MandateId { get; set; } = Guid.NewGuid();
        public int UserId { get; set; }
        public string MandateType { get; set; } = null!; // ANAF, BC, ANAF_BC
        public string Scope { get; set; } = "credit_eligibility_only";
        public string Status { get; set; } = "active"; // active/expired/revoked
        public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } // GrantedAt + 30 days
        public DateTime? RevokedAt { get; set; }
        public string? RevokedReason { get; set; }
        public string? ConsentEventId { get; set; } // Reference to Cosmos event id

        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
        public virtual ICollection<Document> Documents { get; set; } = new List<Document>();
    }
}


