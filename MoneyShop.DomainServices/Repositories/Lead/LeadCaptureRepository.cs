using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Lead;

namespace MoneyShop.DomainServices.Repositories.Lead;

public class LeadCaptureRepository : BaseRepository<LeadCapture>, ILeadCaptureRepository
{
    public LeadCaptureRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
