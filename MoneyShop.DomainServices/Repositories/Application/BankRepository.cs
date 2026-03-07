using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;

namespace MoneyShop.DomainServices.Repositories.Application;

public class BankRepository : BaseRepository<Bank>, IBankRepository
{
    public BankRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
