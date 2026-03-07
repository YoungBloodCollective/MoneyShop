using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;

namespace MoneyShop.DomainServices.RepositoryInterfaces.User;

public interface IUserFinancialDataRepository : IRepository<UserFinancialData>
{
}
