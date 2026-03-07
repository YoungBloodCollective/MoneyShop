namespace MoneyShop.ServiceInterface.Interfaces.Simulator
{
    public interface IScoringService
    {
        ScoringResult CalculateScoring(ScoringRequest request);
    }

    public class ScoringRequest
    {
        public decimal SalariuNet { get; set; }
        public bool? BonuriMasa { get; set; }
        public decimal? SumaBonuriMasa { get; set; }
        public int? VechimeLuni { get; set; }
        public int? NrCrediteBanci { get; set; }
        public int? NrIfn { get; set; }
        public bool? Poprire { get; set; }
        public decimal? SoldTotal { get; set; }
        public bool? Intarzieri { get; set; }
        public int? IntarzieriNumar { get; set; }
        public string? CardCredit { get; set; }
        public string? Overdraft { get; set; }
        public string? Codebitori { get; set; }
    }

    public class ScoringResult
    {
        public decimal Dti { get; set; }
        public string ScoringLevel { get; set; } = null!;
        public string RecommendedLevel { get; set; } = null!;
        public List<string> Reasoning { get; set; } = new List<string>();
    }
}
