using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainServices.RepositoryInterfaces.User;

namespace MoneyShop.DomainServices.Repositories.User;

public class UserFinancialDataRepository : BaseRepository<UserFinancialData>, IUserFinancialDataRepository
{
    public UserFinancialDataRepository(MoneyShopDbContext context) : base(context)
    {
    }
}
