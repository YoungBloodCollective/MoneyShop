using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Eligibility;

namespace MoneyShop.DomainServices.Repositories.Eligibility;

public class AnafReportRepository : BaseRepository<AnafReport>, IAnafReportRepository
{
    public AnafReportRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
