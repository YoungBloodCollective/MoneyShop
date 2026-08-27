using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.Acord;

namespace MoneyShop.DomainServices.Repositories.Acord;

public class AcordClientRepository : BaseRepository<AcordClient>, IAcordClientRepository
{
    public AcordClientRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
