using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class Session : IEntity
    {
        public Guid SessionId { get; set; } = Guid.NewGuid();
        public int UserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public string? Ip { get; set; }
        public string? UserAgent { get; set; }
        public byte[]? DeviceHash { get; set; }
        public string SourceChannel { get; set; } = null!; // web/ios/android

        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
    }
}

