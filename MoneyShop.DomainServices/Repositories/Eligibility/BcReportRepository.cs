using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Eligibility;

namespace MoneyShop.DomainServices.Repositories.Eligibility;

public class BcReportRepository : BaseRepository<BcReport>, IBcReportRepository
{
    public BcReportRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
