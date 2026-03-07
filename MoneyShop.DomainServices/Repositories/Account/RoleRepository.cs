using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;

namespace MoneyShop.DomainServices.Repositories.Account;

public class RoleRepository : BaseRepository<Roluri>, IRoleRepository
{
    public RoleRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
