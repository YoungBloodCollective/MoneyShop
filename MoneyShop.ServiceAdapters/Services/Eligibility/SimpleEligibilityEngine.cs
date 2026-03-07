using MoneyShop.ServiceInterface.Interfaces.Eligibility;
using MoneyShop.ServiceInterface.Dtos.Eligibility;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MoneyShop.ServiceAdapters.Services.Eligibility;

/// <summary>
/// Calculator simplu (fara cont, fara ANAF/BC) conform calculator.txt
/// </summary>
public class SimpleEligibilityEngine : ISimpleEligibilityEngine
{
    private readonly IEligibilityConfigService _configService;

    public SimpleEligibilityEngine(IEligibilityConfigService configService)
    {
        _configService = configService;
    }

    public async Task<EligibilityResponse> CalculateAsync(CalcSimpleRequest request)
    {
        var config = await _configService.GetActiveConfigAsync();
        var requestId = Guid.NewGuid().ToString();

        // 1. Normalizare venit (simplu)
        decimal mealIncome = (request.MealTicketsUser ?? 0) * config.Income.MealTicketWeightSimple;
        decimal eligibleIncome = request.SalaryNetUser + mealIncome;

        if (request.LoanType == "NP")
        {
            return await CalculateNpSimpleAsync(request, config, requestId, eligibleIncome, mealIncome);
        }
        else if (request.LoanType == "IPOTECAR")
        {
            return await CalculateMortgageSimpleAsync(request, config, requestId, eligibleIncome, mealIncome);
        }
        else
        {
            throw new ArgumentException($"Invalid loan type: {request.LoanType}");
        }
    }

    private async Task<EligibilityResponse> CalculateNpSimpleAsync(
        CalcSimpleRequest request,
        RatesRulesConfigModel config,
        string requestId,
        decimal eligibleIncome,
        decimal mealIncome)
    {
        var reasons = new List<Reason>();
        var riskFlags = new List<RiskFlag>();
        string status = "OK";
        string rating = "B";
        string confidence = "MEDIUM";

        // Reguli DTI - simplu (NP)
        decimal dtiUsed = config.Np.DtiStandard;
        string dtiCapReason = "STANDARD_UNDER_5500";
        string lendersPool = "STANDARD";

        if (eligibleIncome >= config.Np.IncomeHighDtiMin)
        {
            dtiUsed = config.Np.DtiHigh;
            dtiCapReason = "INCOME_OVER_5500";
            reasons.Add(new Reason
            {
                Code = "DTI_HIGH_INCOME",
                Title = "Grad de indatorare 50%",
                Details = "Venit >= 5500 lei (declaratie)."
            });
        }
        else
        {
            reasons.Add(new Reason
            {
                Code = "DTI_STANDARD",
                Title = "Grad de indatorare standard",
                Details = "Venit sub 5500 lei (declaratie)."
            });
        }

        // Rata maxima admisa
        decimal existingObligations = 0; // In simplu, nu avem BC
        decimal maxPayment = Math.Max(0, eligibleIncome * dtiUsed - existingObligations);

        if (maxPayment <= 0)
        {
            return CreateDeclinedResponse(requestId, "NP", "DTI_EXCEEDED", "Nu exista spatiu de indatorare", eligibleIncome, mealIncome, config);
        }

        // Term si APR
        int termMonths = Math.Min(request.TermMonths ?? config.Np.MaxTermMonths, config.Np.MaxTermMonths);
        decimal aprUsed = FinancialFormulas.PickNpAprForCalc(config.Np.AprMin, config.Np.AprMax, request.DesiredAmount);

        // Calculeaza suma maxima
        decimal maxAmount = FinancialFormulas.CalculateMaxLoanAmount(maxPayment, aprUsed, termMonths);
        decimal? estimatedPayment = null;
        if (request.DesiredAmount.HasValue)
        {
            estimatedPayment = FinancialFormulas.CalculateMonthlyPayment(request.DesiredAmount.Value, aprUsed, termMonths);
        }

        // Range (best/worst case)
        decimal bestCase = FinancialFormulas.CalculateMaxLoanAmount(maxPayment, config.Np.AprMin, termMonths);
        decimal worstCase = FinancialFormulas.CalculateMaxLoanAmount(maxPayment, config.Np.AprMax, termMonths);

        return new EligibilityResponse
        {
            RequestId = requestId,
            Mode = "SIMPLE",
            LoanType = "NP",
            Currency = request.Currency ?? "RON",
            Status = status,
            Decision = new DecisionBlock
            {
                Rating = rating,
                Confidence = confidence,
                Reasons = reasons,
                RiskFlags = riskFlags
            },
            Income = new IncomeBlock
            {
                EligibleIncomeMonthly = Math.Round(eligibleIncome, 2),
                SalaryNetMonthly = request.SalaryNetUser,
                MealTicketsMonthly = request.MealTicketsUser ?? 0,
                MealTicketWeightUsed = config.Income.MealTicketWeightSimple,
                Source = "USER_DECLARED",
                PeriodMonths = null
            },
            Dti = new DtiBlock
            {
                DtiUsed = dtiUsed,
                DtiCapReason = dtiCapReason,
                ExistingMonthlyObligations = existingObligations,
                MaxMonthlyPayment = Math.Round(maxPayment, 2)
            },
            Rates = new RatesBlock
            {
                Np = new RatesNpBlock
                {
                    AprMin = config.Np.AprMin,
                    AprMax = config.Np.AprMax,
                    AprUsedForCalc = aprUsed,
                    TermMonthsUsed = termMonths
                },
                Mortgage = null
            },
            Offers = new OffersBlock
            {
                MaxLoanAmountRange = new LoanAmountRange
                {
                    BestCase = Math.Round(bestCase, 2),
                    WorstCase = Math.Round(worstCase, 2)
                },
                MaxLoanAmountUsed = Math.Round(maxAmount, 2),
                EstimatedMonthlyPayment = estimatedPayment.HasValue ? Math.Round(estimatedPayment.Value, 2) : null,
                Affordability = new AffordabilityBlock
                {
                    PaymentMax = Math.Round(maxPayment, 2),
                    Notes = new List<string> { "Rezultat orientativ (fara verificare ANAF/BC)." }
                }
            },
            Routing = new RoutingBlock
            {
                LendersPool = lendersPool,
                RecommendedLenders = new List<string>(),
                Notes = new List<string>()
            },
            Meta = new MetaBlock
            {
                ConfigVersion = config.Version,
                CalculatedAt = DateTime.UtcNow
            }
        };
    }

    private async Task<EligibilityResponse> CalculateMortgageSimpleAsync(
        CalcSimpleRequest request,
        RatesRulesConfigModel config,
        string requestId,
        decimal eligibleIncome,
        decimal mealIncome)
    {
        var reasons = new List<Reason>();
        var riskFlags = new List<RiskFlag>();
        string status = "OK";
        string rating = "B";
        string confidence = "MEDIUM";

        // Reguli DTI - simplu (Ipotecar)
        decimal dtiUsed = config.Mortgage.DtiStandard;
        string dtiCapReason = "STANDARD";

        if (eligibleIncome >= config.Mortgage.IncomeDtiHighMin)
        {
            dtiUsed = config.Mortgage.DtiHighIncome;
            dtiCapReason = "INCOME_OVER_6500";
            reasons.Add(new Reason
            {
                Code = "DTI_HIGH_INCOME",
                Title = "Grad de indatorare 55%",
                Details = "Venit >= 6500 lei (declaratie)."
            });
        }
        else
        {
            reasons.Add(new Reason
            {
                Code = "DTI_STANDARD",
                Title = "Grad de indatorare standard",
                Details = "Venit sub 6500 lei (declaratie)."
            });
        }

        // Rata maxima admisa
        decimal existingObligations = 0;
        decimal maxPayment = Math.Max(0, eligibleIncome * dtiUsed - existingObligations);

        if (maxPayment <= 0)
        {
            return CreateDeclinedResponse(requestId, "IPOTECAR", "DTI_EXCEEDED", "Nu exista spatiu de indatorare", eligibleIncome, mealIncome, config);
        }

        // Avans ipotecar
        var mortgageRules = DetermineDownpayment(request, config);

        // Stress rate pentru eligibilitate
        decimal stressApr = config.Mortgage.StressMarginDefault + config.Ircc.Current;
        int termMonths = 360; // 30 ani default

        // Calculeaza suma maxima
        decimal maxAmount = FinancialFormulas.CalculateMaxLoanAmount(maxPayment, stressApr, termMonths);

        return new EligibilityResponse
        {
            RequestId = requestId,
            Mode = "SIMPLE",
            LoanType = "IPOTECAR",
            Currency = request.Currency ?? "RON",
            Status = "OK",
            Decision = new DecisionBlock
            {
                Rating = "B",
                Confidence = "MEDIUM",
                Reasons = reasons,
                RiskFlags = riskFlags
            },
            Income = new IncomeBlock
            {
                EligibleIncomeMonthly = Math.Round(eligibleIncome, 2),
                SalaryNetMonthly = request.SalaryNetUser,
                MealTicketsMonthly = request.MealTicketsUser ?? 0,
                MealTicketWeightUsed = config.Income.MealTicketWeightSimple,
                Source = "USER_DECLARED",
                PeriodMonths = null
            },
            Dti = new DtiBlock
            {
                DtiUsed = dtiUsed,
                DtiCapReason = dtiCapReason,
                ExistingMonthlyObligations = existingObligations,
                MaxMonthlyPayment = Math.Round(maxPayment, 2)
            },
            Rates = new RatesBlock
            {
                Np = null,
                Mortgage = new RatesMortgageBlock
                {
                    PromoFixed3YMin = config.Mortgage.PromoFixedMin,
                    PromoFixed3YMax = config.Mortgage.PromoFixedMax,
                    IrccCurrent = config.Ircc.Current,
                    BankMarginUsed = config.Mortgage.StressMarginDefault,
                    UnderwritingRateUsed = stressApr,
                    TermMonthsUsed = termMonths
                }
            },
            MortgageRules = mortgageRules,
            Offers = new OffersBlock
            {
                MaxLoanAmountRange = null,
                MaxLoanAmountUsed = Math.Round(maxAmount, 2),
                EstimatedMonthlyPayment = null,
                Affordability = new AffordabilityBlock
                {
                    PaymentMax = Math.Round(maxPayment, 2),
                    Notes = new List<string> { "Incadrare conservator pe marja + IRCC." }
                }
            },
            Routing = new RoutingBlock
            {
                LendersPool = "STANDARD",
                RecommendedLenders = new List<string>(),
                Notes = new List<string>()
            },
            Meta = new MetaBlock
            {
                ConfigVersion = config.Version,
                CalculatedAt = DateTime.UtcNow
            }
        };
    }

    private MortgageRulesBlock? DetermineDownpayment(CalcSimpleRequest request, RatesRulesConfigModel config)
    {
        string incomeSource = request.IncomeSource ?? "RO";
        bool hasOwned = request.HasOwnedHomeBefore ?? false;

        if (incomeSource == "RO")
        {
            decimal dp = hasOwned ? config.Mortgage.Downpayment.RoNotFirstHome : config.Mortgage.Downpayment.RoFirstHome;
            return new MortgageRulesBlock
            {
                IncomeSource = "RO",
                HasOwnedHomeBefore = hasOwned,
                DownPaymentMinPercent = dp,
                DownPaymentRangePercent = new List<decimal> { dp, dp }
            };
        }
        else // STRAINATATE
        {
            if (request.ForeignIncomeNetEur.HasValue &&
                request.ForeignIncomeNetEur.Value < config.Mortgage.Downpayment.ForeignIncomeMinEur)
            {
                // Va fi tratat ca warning in risk flags
            }

            decimal selectedDp = request.DownPaymentPercentSelected ?? config.Mortgage.Downpayment.ForeignMin;
            selectedDp = Math.Max(config.Mortgage.Downpayment.ForeignMin,
                Math.Min(selectedDp, config.Mortgage.Downpayment.ForeignMax));

            return new MortgageRulesBlock
            {
                IncomeSource = "STRAINATATE",
                HasOwnedHomeBefore = hasOwned,
                DownPaymentMinPercent = config.Mortgage.Downpayment.ForeignMin,
                DownPaymentRangePercent = new List<decimal>
                {
                    config.Mortgage.Downpayment.ForeignMin,
                    config.Mortgage.Downpayment.ForeignMax
                },
                ForeignIncomeMinEur = config.Mortgage.Downpayment.ForeignIncomeMinEur
            };
        }
    }

    private EligibilityResponse CreateDeclinedResponse(
        string requestId,
        string loanType,
        string reasonCode,
        string reasonTitle,
        decimal eligibleIncome,
        decimal mealIncome,
        RatesRulesConfigModel config)
    {
        return new EligibilityResponse
        {
            RequestId = requestId,
            Mode = "SIMPLE",
            LoanType = loanType,
            Currency = "RON",
            Status = "DECLINED",
            Decision = new DecisionBlock
            {
                Rating = "D",
                Confidence = "MEDIUM",
                Reasons = new List<Reason>
                {
                    new Reason
                    {
                        Code = reasonCode,
                        Title = reasonTitle,
                        Details = "Rata maxima calculata este 0."
                    }
                },
                RiskFlags = new List<RiskFlag>()
            },
            Income = new IncomeBlock
            {
                EligibleIncomeMonthly = Math.Round(eligibleIncome, 2),
                MealTicketsMonthly = mealIncome,
                MealTicketWeightUsed = config.Income.MealTicketWeightSimple,
                Source = "USER_DECLARED"
            },
            Dti = new DtiBlock
            {
                DtiUsed = 0,
                DtiCapReason = "STANDARD",
                ExistingMonthlyObligations = 0,
                MaxMonthlyPayment = 0
            },
            Rates = new RatesBlock { Np = null, Mortgage = null },
            Offers = new OffersBlock
            {
                Affordability = new AffordabilityBlock
                {
                    PaymentMax = 0,
                    Notes = new List<string>()
                }
            },
            Routing = new RoutingBlock
            {
                LendersPool = "NONE",
                RecommendedLenders = new List<string>(),
                Notes = new List<string>()
            },
            Meta = new MetaBlock
            {
                ConfigVersion = config.Version,
                CalculatedAt = DateTime.UtcNow
            }
        };
    }
}
