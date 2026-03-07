namespace MoneyShop.ServiceInterface.Dtos.Eligibility
{
    // Request Models
    public class CalcSimpleRequest
    {
        public string LoanType { get; set; } = null!;
        public string? Currency { get; set; } = "RON";
        public decimal SalaryNetUser { get; set; }
        public decimal? MealTicketsUser { get; set; }
        public int? TermMonths { get; set; }
        public decimal? DesiredAmount { get; set; }

        // Mortgage extras
        public decimal? PropertyValue { get; set; }
        public bool? HasOwnedHomeBefore { get; set; }
        public string? IncomeSource { get; set; }
        public decimal? ForeignIncomeNetEur { get; set; }
        public decimal? DownPaymentPercentSelected { get; set; }
    }

    public class CalcVerifiedRequest
    {
        public string LoanType { get; set; } = null!;
        public string? Currency { get; set; } = "RON";
        public int UserId { get; set; }

        public int? TermMonths { get; set; }
        public decimal? DesiredAmount { get; set; }
        public decimal? PropertyValue { get; set; }
        public bool? HasOwnedHomeBefore { get; set; }
        public string? IncomeSource { get; set; }
        public decimal? ForeignIncomeNetEur { get; set; }

        // Report IDs
        public string AnafReportId { get; set; } = null!;
        public string BcReportId { get; set; } = null!;
    }

    // Response Models
    public class EligibilityResponse
    {
        public string RequestId { get; set; } = null!;
        public string Mode { get; set; } = null!;
        public string LoanType { get; set; } = null!;
        public string Currency { get; set; } = "RON";
        public string Status { get; set; } = null!;

        public DecisionBlock Decision { get; set; } = null!;
        public IncomeBlock Income { get; set; } = null!;
        public DtiBlock Dti { get; set; } = null!;
        public RatesBlock Rates { get; set; } = null!;
        public MortgageRulesBlock? MortgageRules { get; set; }
        public OffersBlock Offers { get; set; } = null!;
        public RoutingBlock Routing { get; set; } = null!;
        public CreditBureauBlock? CreditBureau { get; set; }
        public MetaBlock Meta { get; set; } = null!;
    }

    public class DecisionBlock
    {
        public string Rating { get; set; } = null!;
        public string Confidence { get; set; } = null!;
        public List<Reason> Reasons { get; set; } = new();
        public List<RiskFlag> RiskFlags { get; set; } = new();
    }

    public class Reason
    {
        public string Code { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string? Details { get; set; }
    }

    public class RiskFlag
    {
        public string Code { get; set; } = null!;
        public string Severity { get; set; } = null!;
        public string? Details { get; set; }
    }

    public class IncomeBlock
    {
        public decimal EligibleIncomeMonthly { get; set; }
        public decimal? SalaryNetMonthly { get; set; }
        public decimal? MealTicketsMonthly { get; set; }
        public decimal? MealTicketWeightUsed { get; set; }
        public string Source { get; set; } = null!;
        public int? PeriodMonths { get; set; }
        public AnafData? Anaf { get; set; }
    }

    public class AnafData
    {
        public decimal AvgNet6M { get; set; }
        public decimal AvgMeal6M { get; set; }
    }

    public class DtiBlock
    {
        public decimal DtiUsed { get; set; }
        public string DtiCapReason { get; set; } = null!;
        public decimal ExistingMonthlyObligations { get; set; }
        public decimal MaxMonthlyPayment { get; set; }
    }

    public class RatesBlock
    {
        public RatesNpBlock? Np { get; set; }
        public RatesMortgageBlock? Mortgage { get; set; }
    }

    public class RatesNpBlock
    {
        public decimal AprMin { get; set; }
        public decimal AprMax { get; set; }
        public decimal AprUsedForCalc { get; set; }
        public int TermMonthsUsed { get; set; }
    }

    public class RatesMortgageBlock
    {
        public decimal PromoFixed3YMin { get; set; }
        public decimal PromoFixed3YMax { get; set; }
        public decimal IrccCurrent { get; set; }
        public decimal BankMarginUsed { get; set; }
        public decimal UnderwritingRateUsed { get; set; }
        public int TermMonthsUsed { get; set; }
    }

    public class MortgageRulesBlock
    {
        public string IncomeSource { get; set; } = null!;
        public bool HasOwnedHomeBefore { get; set; }
        public decimal DownPaymentMinPercent { get; set; }
        public List<decimal> DownPaymentRangePercent { get; set; } = new();
        public decimal? ForeignIncomeMinEur { get; set; }
    }

    public class OffersBlock
    {
        public LoanAmountRange? MaxLoanAmountRange { get; set; }
        public decimal? MaxLoanAmountUsed { get; set; }
        public decimal? EstimatedMonthlyPayment { get; set; }
        public AffordabilityBlock Affordability { get; set; } = null!;
    }

    public class LoanAmountRange
    {
        public decimal BestCase { get; set; }
        public decimal WorstCase { get; set; }
    }

    public class AffordabilityBlock
    {
        public decimal PaymentMax { get; set; }
        public decimal? PaymentBuffer { get; set; }
        public List<string> Notes { get; set; } = new();
    }

    public class RoutingBlock
    {
        public string LendersPool { get; set; } = null!;
        public List<string> RecommendedLenders { get; set; } = new();
        public List<string> Notes { get; set; } = new();
    }

    public class CreditBureauBlock
    {
        public int? FicoScore { get; set; }
        public DpdLast4Y? DpdLast4Y { get; set; }
        public NonbankData? Nonbank { get; set; }
    }

    public class DpdLast4Y
    {
        public int Dpd30Count { get; set; }
        public int Dpd60Count { get; set; }
        public int Dpd90PlusCount { get; set; }
    }

    public class NonbankData
    {
        public int ClosedLast4Y { get; set; }
        public int ActiveNow { get; set; }
    }

    public class MetaBlock
    {
        public string ConfigVersion { get; set; } = null!;
        public DateTime CalculatedAt { get; set; }
    }

    // Config Model
    public class RatesRulesConfigModel
    {
        public string Version { get; set; } = null!;
        public IrccConfig Ircc { get; set; } = null!;
        public IncomeConfig Income { get; set; } = null!;
        public NpConfig Np { get; set; } = null!;
        public MortgageConfig Mortgage { get; set; } = null!;
        public RiskFlagsConfig RiskFlags { get; set; } = null!;
    }

    public class IrccConfig
    {
        public decimal Current { get; set; }
        public decimal? Next { get; set; }
        public string Source { get; set; } = null!;
        public string LastUpdated { get; set; } = null!;
    }

    public class IncomeConfig
    {
        public decimal MealTicketWeightSimple { get; set; }
        public decimal MealTicketWeightVerified { get; set; }
    }

    public class NpConfig
    {
        public int MaxTermMonths { get; set; }
        public decimal AprMin { get; set; }
        public decimal AprMax { get; set; }
        public decimal DtiStandard { get; set; }
        public decimal DtiHigh { get; set; }
        public decimal IncomeHighDtiMin { get; set; }
        public int FicoMinStandard { get; set; }
        public int FicoMinHighDti { get; set; }
        public int FicoMinFallback { get; set; }
        public List<HighDtiWindow> HighDtiWindows { get; set; } = new();
        public List<string> FallbackLenders { get; set; } = new();
    }

    public class HighDtiWindow
    {
        public string Start { get; set; } = null!;
        public string End { get; set; } = null!;
    }

    public class MortgageConfig
    {
        public decimal PromoFixedMin { get; set; }
        public decimal PromoFixedMax { get; set; }
        public decimal StressMarginDefault { get; set; }
        public decimal DtiStandard { get; set; }
        public decimal DtiHighIncome { get; set; }
        public decimal IncomeDtiHighMin { get; set; }
        public DownpaymentConfig Downpayment { get; set; } = null!;
        public BcRulesConfig BcRules { get; set; } = null!;
    }

    public class DownpaymentConfig
    {
        public decimal RoFirstHome { get; set; }
        public decimal RoNotFirstHome { get; set; }
        public decimal ForeignIncomeMinEur { get; set; }
        public decimal ForeignMin { get; set; }
        public decimal ForeignMax { get; set; }
    }

    public class BcRulesConfig
    {
        public int Max30DpdLast4Y { get; set; }
        public int Max60DpdLast4Y { get; set; }
        public string Any90DpdLast4Y { get; set; } = null!;
    }

    public class RiskFlagsConfig
    {
        public int IfnClosed4YGt { get; set; }
        public int IfnActiveGt { get; set; }
        public string Action { get; set; } = null!;
        public decimal? ReducedDtiValue { get; set; }
    }
}
