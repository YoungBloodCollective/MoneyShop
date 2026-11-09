using MoneyShop.DomainModel;
using System;

namespace MoneyShop.DomainModel.Entities
{
    public partial class RetentionRun : IEntity
    {
        public int Id { get; set; }
        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? FinishedAt { get; set; }
        public string Status { get; set; } = "running";
        public string? SummaryJson { get; set; }
        public string? Error { get; set; }
    }
}
