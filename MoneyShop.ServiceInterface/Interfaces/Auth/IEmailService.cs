namespace MoneyShop.ServiceInterface.Interfaces.Auth
{
    public interface IEmailService
    {
        Task<bool> SendVerificationCodeAsync(string toEmail, string code);
    }
}
