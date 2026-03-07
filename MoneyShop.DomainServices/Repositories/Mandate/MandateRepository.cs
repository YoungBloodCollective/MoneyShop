using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Mandate;

namespace MoneyShop.DomainServices.Repositories.Mandate;

public class MandateRepository : BaseRepository<MoneyShop.DomainModel.Entities.Mandate>, IMandateRepository
{
    public MandateRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
