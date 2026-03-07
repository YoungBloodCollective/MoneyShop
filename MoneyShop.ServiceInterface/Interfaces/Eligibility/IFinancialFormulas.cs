namespace MoneyShop.ServiceInterface.Interfaces.Eligibility
{
    /// <summary>
    /// Note: The original FinancialFormulas class is static.
    /// This interface provides an instance-based abstraction for testability.
    /// </summary>
    public interface IFinancialFormulas
    {
        decimal CalculateMaxLoanAmount(decimal monthlyPayment, decimal aprPercent, int nMonths);
        decimal CalculateMonthlyPayment(decimal principal, decimal aprPercent, int nMonths);
        bool IsInHighDtiWindow(DateTime today, List<(DateTime start, DateTime end)> windows);
        decimal PickNpAprForCalc(decimal aprMin, decimal aprMax, decimal? desiredAmount = null);
    }
}
