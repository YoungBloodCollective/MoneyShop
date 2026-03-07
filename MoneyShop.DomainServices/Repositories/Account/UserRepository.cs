using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;

namespace MoneyShop.DomainServices.Repositories.Account;

public class UserRepository : BaseRepository<Utilizatori>, IUserRepository
{
    public UserRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
