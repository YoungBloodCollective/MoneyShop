using MoneyShop.DomainModel;
using System;

namespace MoneyShop.DomainModel.Entities
{
    /// <summary>
    /// One row per time a full CNP left storage in readable form - who read it, when, for
    /// which subject and why. Showing the number in the interface is only defensible if
    /// every showing is on the record, so this table is written on the same path that
    /// decrypts, not by the caller remembering to.
    /// </summary>
    public partial class CnpAccessLog : IEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string SubjectId { get; set; } = null!;
        public int? ActorUserId { get; set; }
        public string? ActorRole { get; set; }

        /// <summary>Why it was read, e.g. "admin_view" or "bank_consent_form".</summary>
        public string Reason { get; set; } = null!;

        public Guid? AcordId { get; set; }
        public string? Ip { get; set; }
        public string? UserAgent { get; set; }
        public DateTime AccessedAt { get; set; } = DateTime.UtcNow;
    }
}
