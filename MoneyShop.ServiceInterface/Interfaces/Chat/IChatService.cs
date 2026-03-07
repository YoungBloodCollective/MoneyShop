using MoneyShop.ServiceInterface.Dtos.Chat;

namespace MoneyShop.ServiceInterface.Interfaces.Chat
{
    public interface IChatService
    {
        Task<ChatResponse> ChatAsync(ChatRequest request, IFaqCacheService? faqCacheService = null);
    }
}
