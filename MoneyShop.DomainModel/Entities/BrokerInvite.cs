using System;

namespace MoneyShop.DomainModel.Entities
{
    public class BrokerInvite : IEntity
    {
        public int Id { get; set; }
        public string Email { get; set; } = null!;
        public string? Name { get; set; }
        public string Type { get; set; } = BrokerTypes.Afiliat;
        public string TokenHash { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int CreatedByUserId { get; set; }
        public DateTime? UsedAt { get; set; }
        public int? UsedByUserId { get; set; }
        public DateTime? RevokedAt { get; set; }

        public virtual Utilizatori? UsedByUser { get; set; }
    }
}
