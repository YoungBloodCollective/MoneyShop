using MoneyShop.Infrastructure.EntityFramework.Common;

namespace MoneyShop.DomainServices.RepositoryInterfaces.Application;

public interface IApplicationRepository : IRepository<MoneyShop.DomainModel.Entities.Application>
{
}
