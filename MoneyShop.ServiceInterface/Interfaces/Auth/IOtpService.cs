namespace MoneyShop.ServiceInterface.Interfaces.Auth
{
    public interface IOtpService
    {
        OtpRequestResult RequestOtp(string phoneOrEmail, string purpose, int? userId, string? ip, byte[]? deviceHash, string? channel = null);
        OtpVerifyResult VerifyOtp(Guid otpId, string phoneOrEmail, string purpose, string code, string? ip);
    }

    public class OtpRequestResult
    {
        public Guid OtpId { get; set; }
        public int ExpiresInSeconds { get; set; }
    }

    public class OtpVerifyResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = null!;
        public int? UserId { get; set; }
    }
}
