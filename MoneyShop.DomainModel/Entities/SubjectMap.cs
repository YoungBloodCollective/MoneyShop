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

        /// <summary>
        /// The full CNP, AES-256-GCM encrypted. Null for subjects created before the CNP
        /// was kept, and for any subject seen while no encryption key was configured.
        /// Lookups still go through <see cref="CnpHash"/>; this column is never searched.
        /// </summary>
        public byte[]? CnpEncrypted { get; set; }

        /// <summary>"M", "F", or null - derived from the CNP when it was last seen.</summary>
        public string? Sex { get; set; }

        /// <summary>Derived from the CNP when it was last seen, so reads need no decryption.</summary>
        public DateTime? BirthDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
    }
}

