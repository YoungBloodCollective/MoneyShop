namespace MoneyShop.ServiceInterface.Interfaces.Mandate
{
    public interface IMandateService
    {
        MandateCreateResult CreateMandate(int userId, string mandateType, string? consentEventId, int expiresInDays = 30);
        MandateInfo? GetMandate(Guid mandateId, int userId);
        List<MandateInfo> GetUserMandates(int userId);
        bool RevokeMandate(Guid mandateId, int userId, string? reason = null);
        bool HasActiveMandate(int userId, string mandateType);
    }

    public class MandateCreateResult
    {
        public Guid MandateId { get; set; }
        public string Status { get; set; } = null!;
        public DateTime GrantedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class MandateInfo
    {
        public Guid MandateId { get; set; }
        public string MandateType { get; set; } = null!;
        public string Status { get; set; } = null!;
        public DateTime GrantedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public DateTime? RevokedAt { get; set; }
    }
}
