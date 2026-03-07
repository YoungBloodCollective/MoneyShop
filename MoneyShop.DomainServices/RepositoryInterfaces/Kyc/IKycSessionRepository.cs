using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.Common;

namespace MoneyShop.DomainServices.RepositoryInterfaces.Kyc;

public interface IKycSessionRepository : IRepository<KycSession>
{
}
