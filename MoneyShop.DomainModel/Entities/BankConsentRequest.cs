using System;

namespace MoneyShop.DomainModel.Entities
{
    public class BankConsentRequest : IEntity, IBrokerOwned
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid AcordId { get; set; }
        public int? BrokerProfileId { get; set; }
        public string BankCode { get; set; } = null!;
        public string TokenHash { get; set; } = null!;

        public string FullName { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string? Email { get; set; }

        public string Status { get; set; } = "pending";
        public int? CreatedByUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public DateTime? SignedAt { get; set; }
        public string? SignedIp { get; set; }
        public string? SignedUserAgent { get; set; }
        public Guid? FileId { get; set; }
    }
}
