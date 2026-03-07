using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class OtpChallenge : IEntity
    {
        public Guid OtpId { get; set; } = Guid.NewGuid();
        public int? UserId { get; set; }
        public string Phone { get; set; } = null!;
        public string? Email { get; set; }
        public string Purpose { get; set; } = null!; // LOGIN_SMS, SIGN_SMS, EMAIL_VERIFY, STEP_UP_SECURITY
        public byte[] OtpHash { get; set; } = null!; // HMAC-SHA256 hash
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public int Attempts { get; set; } = 0;
        public DateTime? UsedAt { get; set; }
        public string? Ip { get; set; }
        public byte[]? DeviceHash { get; set; }

        // Navigation
        public virtual Utilizatori? User { get; set; }
    }
}
