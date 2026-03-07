using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;

namespace MoneyShop.DomainServices.Repositories.Kyc;

public class KycSessionRepository : BaseRepository<KycSession>, IKycSessionRepository
{
    public KycSessionRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
