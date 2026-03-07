using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Eligibility;
using MoneyShop.ServiceInterface.Dtos.Eligibility;
using MoneyShop.DomainServices.RepositoryInterfaces.Eligibility;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using System.Text.Json;
using System.Linq;

namespace MoneyShop.ServiceAdapters.Services.Eligibility;

public class EligibilityConfigService : IEligibilityConfigService
{
    private readonly IRatesRulesConfigRepository _ratesRulesConfigRepository;
    private readonly MoneyShopDbContext _context;

    public EligibilityConfigService(
        IRatesRulesConfigRepository ratesRulesConfigRepository,
        MoneyShopDbContext context)
    {
        _ratesRulesConfigRepository = ratesRulesConfigRepository;
        _context = context;
    }

    /// <summary>
    /// Incarca configuratia activa de rates and rules
    /// </summary>
    public async Task<RatesRulesConfigModel> GetActiveConfigAsync()
    {
        var config = _ratesRulesConfigRepository.Get()
            .Where(c => c.IsActive)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefault();

        if (config == null)
        {
            return GetDefaultConfig();
        }

        try
        {
            var model = JsonSerializer.Deserialize<RatesRulesConfigModel>(config.ConfigJson);
            if (model == null)
                return GetDefaultConfig();

            return model;
        }
        catch
        {
            return GetDefaultConfig();
        }
    }

    /// <summary>
    /// Configuratie default conform calculator.txt
    /// </summary>
    private RatesRulesConfigModel GetDefaultConfig()
    {
        return new RatesRulesConfigModel
        {
            Version = "2026-01-05-default",
            Ircc = new IrccConfig
            {
                Current = 5.68m,
                Next = 5.58m,
                Source = "manual",
                LastUpdated = DateTime.UtcNow.ToString("yyyy-MM-dd")
            },
            Income = new IncomeConfig
            {
                MealTicketWeightSimple = 1.0m,
                MealTicketWeightVerified = 0.5m
            },
            Np = new NpConfig
            {
                MaxTermMonths = 60,
                AprMin = 7.49m,
                AprMax = 15.99m,
                DtiStandard = 0.40m,
                DtiHigh = 0.50m,
                IncomeHighDtiMin = 5500m,
                FicoMinStandard = 581,
                FicoMinHighDti = 601,
                FicoMinFallback = 500,
                HighDtiWindows = new List<HighDtiWindow>
                {
                    new() { Start = "2026-01-02", End = "2026-01-06" },
                    new() { Start = "2026-04-01", End = "2026-04-06" },
                    new() { Start = "2026-07-01", End = "2026-07-06" },
                    new() { Start = "2026-10-01", End = "2026-10-06" }
                },
                FallbackLenders = new List<string> { "GARANTI", "BRD", "ING" }
            },
            Mortgage = new MortgageConfig
            {
                PromoFixedMin = 4.79m,
                PromoFixedMax = 5.99m,
                StressMarginDefault = 2.49m,
                DtiStandard = 0.40m,
                DtiHighIncome = 0.55m,
                IncomeDtiHighMin = 6500m,
                Downpayment = new DownpaymentConfig
                {
                    RoFirstHome = 0.15m,
                    RoNotFirstHome = 0.25m,
                    ForeignIncomeMinEur = 2000m,
                    ForeignMin = 0.25m,
                    ForeignMax = 0.40m
                },
                BcRules = new BcRulesConfig
                {
                    Max30DpdLast4Y = 4,
                    Max60DpdLast4Y = 1,
                    Any90DpdLast4Y = "manual_review"
                }
            },
            RiskFlags = new RiskFlagsConfig
            {
                IfnClosed4YGt = 10,
                IfnActiveGt = 4,
                Action = "manual_review",
                ReducedDtiValue = 0.35m
            }
        };
    }
}
