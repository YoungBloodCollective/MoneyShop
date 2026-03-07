using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Chat;

namespace MoneyShop.DomainServices.Repositories.Chat;

public class ChatRateLimitRepository : BaseRepository<ChatRateLimit>, IChatRateLimitRepository
{
    public ChatRateLimitRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
