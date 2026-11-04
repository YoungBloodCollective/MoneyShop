using System;

namespace MoneyShop.ServiceInterface.Interfaces.Subject
{
    public interface ISubjectService
    {
        SubjectMapResult GetOrCreateSubject(int userId, string cnp);
        SubjectMapResult? GetSubjectByUserId(int userId);
        SubjectMapResult? GetSubjectById(string subjectId);

        /// <summary>
        /// Decrypts the stored CNP and records the reading. Returns null when the subject is
        /// unknown or has no stored CNP, in which case nothing is recorded.
        /// </summary>
        string? RevealCnpByUserId(int userId, CnpAccessContext access);
    }

    /// <summary>
    /// Who is reading a full CNP and why. Every field lands in the access log.
    /// </summary>
    public class CnpAccessContext
    {
        public int? ActorUserId { get; set; }
        public string? ActorRole { get; set; }

        /// <summary>Short, stable reason code, e.g. "admin_view" or "bank_consent_form".</summary>
        public string Reason { get; set; } = null!;

        public Guid? AcordId { get; set; }
        public string? Ip { get; set; }
        public string? UserAgent { get; set; }
    }

    public class SubjectMapResult
    {
        public string SubjectId { get; set; } = null!;
        public byte[] CnpHash { get; set; } = null!;
        public string? CnpLast4 { get; set; }
        public string CnpMasked { get; set; } = null!;

        /// <summary>"M", "F", or null - derived from the CNP, not from the document reader.</summary>
        public string? Sex { get; set; }

        /// <summary>Derived from the CNP, not from the document reader.</summary>
        public DateTime? BirthDate { get; set; }

        /// <summary>True when a full CNP is stored and can be revealed.</summary>
        public bool HasStoredCnp { get; set; }

        public bool IsNew { get; set; }
    }
}
