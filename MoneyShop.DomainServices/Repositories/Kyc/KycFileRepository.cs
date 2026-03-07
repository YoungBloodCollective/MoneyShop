using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;

namespace MoneyShop.DomainServices.Repositories.Kyc;

public class KycFileRepository : BaseRepository<KycFile>, IKycFileRepository
{
    public KycFileRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
