using MoneyShop.DomainModel;
using System;

namespace MoneyShop.DomainModel.Entities
{
    public partial class AuditEvent : IEntity
    {
        public long Id { get; set; }
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
        public int? ActorUserId { get; set; }
        public string? ActorRole { get; set; }
        public string? ActorIp { get; set; }
        public int? BrokerProfileId { get; set; }
        public string EntityType { get; set; } = null!;
        public string EntityId { get; set; } = null!;
        public string Action { get; set; } = null!;
        public string? OldValueJson { get; set; }
        public string? NewValueJson { get; set; }
        public string? Reason { get; set; }
    }
}
