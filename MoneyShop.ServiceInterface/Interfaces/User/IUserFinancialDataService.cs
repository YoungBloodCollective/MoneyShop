using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Simulator;

namespace MoneyShop.ServiceInterface.Interfaces.User
{
    public interface IUserFinancialDataService
    {
        UserFinancialData SaveFinancialData(int userId, ScoringRequest request, ScoringResult result);
        UserFinancialData? GetFinancialData(int userId);
    }
}
