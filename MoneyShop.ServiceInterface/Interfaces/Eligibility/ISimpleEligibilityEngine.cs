using MoneyShop.ServiceInterface.Dtos.Eligibility;

namespace MoneyShop.ServiceInterface.Interfaces.Eligibility
{
    public interface ISimpleEligibilityEngine
    {
        Task<EligibilityResponse> CalculateAsync(CalcSimpleRequest request);
    }
}
