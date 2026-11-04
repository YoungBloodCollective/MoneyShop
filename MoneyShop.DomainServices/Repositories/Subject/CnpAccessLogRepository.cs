using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Subject;

namespace MoneyShop.DomainServices.Repositories.Subject;

public class CnpAccessLogRepository : BaseRepository<CnpAccessLog>, ICnpAccessLogRepository
{
    public CnpAccessLogRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
