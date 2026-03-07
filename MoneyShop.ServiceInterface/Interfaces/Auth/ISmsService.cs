namespace MoneyShop.ServiceInterface.Interfaces.Auth
{
    public interface ISmsService
    {
        Task<bool> SendVerificationCodeAsync(string toPhoneNumber, string code);
    }
}
