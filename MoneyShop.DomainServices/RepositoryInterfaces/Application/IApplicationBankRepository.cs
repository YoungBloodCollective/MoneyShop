using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;

namespace MoneyShop.DomainServices.RepositoryInterfaces.Application;

public interface IApplicationBankRepository : IRepository<ApplicationBank>
{
}
