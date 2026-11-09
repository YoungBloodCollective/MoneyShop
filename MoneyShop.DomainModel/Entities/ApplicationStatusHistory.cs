using MoneyShop.DomainModel;
using System;

namespace MoneyShop.DomainModel.Entities
{
    public partial class ApplicationStatusHistory : IEntity
    {
        public int Id { get; set; }
        public int ApplicationId { get; set; }
        public string? FromStatus { get; set; }
        public string ToStatus { get; set; } = null!;
        public int? ChangedByUserId { get; set; }
        public string? ChangedByRole { get; set; }
        public string? Note { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        public virtual Application Application { get; set; } = null!;
    }
}
