using MoneyShop.DomainModel.Entities;

namespace MoneyShop.ServiceInterface.Interfaces.Chat
{
    public interface IFaqCacheService
    {
        Task<(bool Hit, FaqItem? Item, double? Score)> MatchFaqAsync(string userMessage);
    }
}
