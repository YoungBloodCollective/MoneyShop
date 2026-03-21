using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Simulator;

namespace MoneyShop.ServiceInterface.Interfaces.User
{
    public interface IUserFinancialDataService
    {
        UserFinancialData SaveFinancialData(int userId, ScoringRequest request, ScoringResult result);
        UserFinancialData? GetFinancialData(int userId);
        UserFinancialData SaveManualFinancialData(int userId, ManualFinancialDataDto dto);
    }

    public class ManualFinancialDataDto
    {
        public decimal? Salariu1 { get; set; }
        public decimal? Salariu2 { get; set; }
        public decimal? Salariu3 { get; set; }
        public bool? BonuriMasa { get; set; }
        public decimal? SumaBonuriMasa { get; set; }
        public List<CreditEntryDto> Credits { get; set; } = new();
    }

    public class CreditEntryDto
    {
        public string Name { get; set; } = "";
        public decimal RemainingAmount { get; set; }
        public int MonthsLeft { get; set; }
        public decimal MonthlyPayment { get; set; }
    }
}
