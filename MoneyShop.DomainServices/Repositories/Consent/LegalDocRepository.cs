using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Consent;

namespace MoneyShop.DomainServices.Repositories.Consent;

public class LegalDocRepository : BaseRepository<LegalDoc>, ILegalDocRepository
{
    public LegalDocRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
