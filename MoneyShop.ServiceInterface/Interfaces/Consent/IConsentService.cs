namespace MoneyShop.ServiceInterface.Interfaces.Consent
{
    public interface IConsentService
    {
        ConsentGrantResult GrantConsent(
            int userId,
            string consentType,
            string docType,
            string docVersion,
            string consentTextSnapshot,
            Guid? sessionId,
            string? ip,
            string? userAgent,
            byte[]? deviceHash,
            string sourceChannel);
        bool RevokeConsent(Guid consentId, int userId);
        List<ConsentInfo> GetUserConsents(int userId);
    }

    public class ConsentGrantResult
    {
        public Guid ConsentId { get; set; }
        public string Status { get; set; } = null!;
        public DateTime GrantedAt { get; set; }
    }

    public class ConsentInfo
    {
        public Guid ConsentId { get; set; }
        public string ConsentType { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateTime GrantedAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public string? DocType { get; set; }
        public string? DocVersion { get; set; }
    }
}
