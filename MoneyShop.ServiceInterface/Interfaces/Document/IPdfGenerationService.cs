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
