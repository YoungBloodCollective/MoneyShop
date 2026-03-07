using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;

namespace MoneyShop.DomainServices.Repositories.Application;

public class ApplicationRepository : BaseRepository<MoneyShop.DomainModel.Entities.Application>, IApplicationRepository
{
    public ApplicationRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
