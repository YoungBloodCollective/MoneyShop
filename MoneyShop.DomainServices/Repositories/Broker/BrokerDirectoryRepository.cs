using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Broker;

namespace MoneyShop.DomainServices.Repositories.Broker;

public class BrokerDirectoryRepository : BaseRepository<BrokerDirectory>, IBrokerDirectoryRepository
{
    public BrokerDirectoryRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
