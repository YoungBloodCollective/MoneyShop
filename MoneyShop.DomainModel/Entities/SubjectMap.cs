using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class SubjectMap : IEntity
    {
        public string SubjectId { get; set; } = null!; // "MS-" + 16 chars BASE32
        public int UserId { get; set; }
        public byte[] CnpHash { get; set; } = null!; // HMAC-SHA256(pepper1, CNP)
        public string? CnpLast4 { get; set; } // Last 4 digits for masking
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
    }
}

