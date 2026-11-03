namespace MoneyShop.ServiceInterface.Interfaces.Document
{
    public interface IPdfGenerationService
    {
        MandatePdfResult GenerateMandatePdf(
            Guid mandateId,
            int userId,
            string mandateType,
            string? consentTextSnapshot,
            string? consentEventId,
            string? ip,
            string? userAgent,
            DateTime grantedAt,
            DateTime expiresAt);

        byte[] GenerateAcordAgreementPdf(AcordAgreementPdfInput input);

        byte[] GenerateMangoAgreementPdf(MangoAgreementPdfInput input);

        /// <summary>
        /// Fills one bank form. A null signature produces the unsigned copy the client
        /// reads before signing.
        /// </summary>
        byte[] GenerateBankConsentPdf(string bankCode, string documentCode, BankConsentPdfInput input);
    }

    public class BankConsentPdfInput
    {
        public string FullName { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string? Email { get; set; }

        /// <summary>
        /// Only the forms that ask for it (Patria's ANAF consent) receive a CNP, and it is
        /// typed by the client at signing time: the platform stores only a masked form.
        /// </summary>
        public string? Cnp { get; set; }
        public string? Address { get; set; }
        public string? BirthDate { get; set; }

        public string? BrokerCompany { get; set; }
        public string? BrokerRepresentative { get; set; }

        /// <summary>
        /// Ce cere doar cererea de credit, peste consimtamintele simple. Ce lipseste ramane
        /// necompletat, ca brokerul sa stie ce are de adaugat.
        /// </summary>
        public string? PlaceOfBirth { get; set; }
        public string? IdSeries { get; set; }
        public string? IdNumber { get; set; }
        public string? IssuedBy { get; set; }
        public string? IssueDate { get; set; }
        public string? StareCivila { get; set; }
        public string? StareLocativa { get; set; }
        public string? Studii { get; set; }
        public string? FunctieActuala { get; set; }
        public string? NumeFirma { get; set; }
        public int? VechimeTotalaLuni { get; set; }

        /// <summary>Null on the blank copy the client reads before signing.</summary>
        public DateTime? SignedOn { get; set; }
        public byte[]? SignaturePng { get; set; }
    }

    public class MangoAgreementPdfInput
    {
        public string FullName { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string? Email { get; set; }
        public string? BirthDate { get; set; }
        public DateTime SignedOn { get; set; }
        public string RequestNumber { get; set; } = null!;
        public bool Oug52Waived { get; set; }
        public byte[] SignaturePng { get; set; } = null!;
        public string RepresentativeCompany { get; set; } = null!;
        public string RepresentativeRegCom { get; set; } = null!;
        public string RepresentativeCui { get; set; } = null!;
        public string RepresentativeAddress { get; set; } = null!;
        public string RepresentativePhone { get; set; } = null!;
        public string RepresentativeEmail { get; set; } = null!;
    }

    public class AcordAgreementPdfInput
    {
        public Guid AcordId { get; set; }
        public string Nume { get; set; } = null!;
        public string Prenume { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string? Email { get; set; }
        public string ConsentVersion { get; set; } = null!;
        public string ConsentTextSnapshot { get; set; } = null!;
        public bool MarketingAccepted { get; set; }
        public bool Oug52Waived { get; set; }
        public DateTime SignedAt { get; set; }
        public string? Ip { get; set; }
        public string? UserAgent { get; set; }
        public byte[] SignaturePng { get; set; } = null!;
        public IReadOnlyList<KeyValuePair<string, string>> DeclaredData { get; set; } = Array.Empty<KeyValuePair<string, string>>();
        public string BrokerCompany { get; set; } = null!;
    }

    public class MandatePdfResult
    {
        public string BlobPath { get; set; } = null!;
        public byte[] Sha256Hash { get; set; } = null!;
        public string Sha256Base64 { get; set; } = null!;
        public long FileSize { get; set; }
        public DateTime GeneratedAt { get; set; }
    }
}
