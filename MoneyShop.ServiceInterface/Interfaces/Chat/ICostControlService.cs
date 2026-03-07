namespace MoneyShop.ServiceInterface.Interfaces.Chat
{
    public interface ICostControlService
    {
        Task EnforceMonthlyBudgetAsync();
        Task AddUsageAsync(decimal usdDelta, string? metadata = null);
    }
}
