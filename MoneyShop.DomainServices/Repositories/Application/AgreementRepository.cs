using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;

namespace MoneyShop.DomainServices.Repositories.Application;

public class AgreementRepository : BaseRepository<Agreement>, IAgreementRepository
{
    public AgreementRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
