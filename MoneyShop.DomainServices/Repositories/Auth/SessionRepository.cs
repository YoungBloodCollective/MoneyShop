using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Auth;

namespace MoneyShop.DomainServices.Repositories.Auth;

public class SessionRepository : BaseRepository<Session>, ISessionRepository
{
    public SessionRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
