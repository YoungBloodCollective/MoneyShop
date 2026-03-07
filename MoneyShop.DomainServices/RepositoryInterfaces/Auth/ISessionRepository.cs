using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;

namespace MoneyShop.DomainServices.RepositoryInterfaces.Auth;

public interface ISessionRepository : IRepository<Session>
{
}
