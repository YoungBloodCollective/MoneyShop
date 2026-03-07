namespace MoneyShop.ServiceInterface.Interfaces.Chat
{
    public interface IRateLimitService
    {
        Task EnforceRateLimitAsync(int userId);
    }
}
