using MoneyShop.ServiceInterface.Dtos.Eligibility;

namespace MoneyShop.ServiceInterface.Interfaces.Eligibility
{
    public interface IEligibilityConfigService
    {
        Task<RatesRulesConfigModel> GetActiveConfigAsync();
    }
}
