using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Consent;

namespace MoneyShop.DomainServices.Repositories.Consent;

public class ConsentRepository : BaseRepository<MoneyShop.DomainModel.Entities.Consent>, IConsentRepository
{
    public ConsentRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
