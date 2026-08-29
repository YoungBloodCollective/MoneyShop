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
