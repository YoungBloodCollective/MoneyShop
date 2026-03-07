using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Simulator;
using System.Text.Json;

namespace MoneyShop.ServiceAdapters.Services.Simulator;

public class ScoringService : IScoringService
{
    public ScoringService()
    {
    }

    public ScoringResult CalculateScoring(ScoringRequest request)
    {
        // Calculeaza venitul total (inclusiv bonuri de masa)
        decimal venitTotal = request.SalariuNet;
        if (request.BonuriMasa == true && request.SumaBonuriMasa.HasValue)
        {
            venitTotal += request.SumaBonuriMasa.Value;
        }

        // Calculeaza rata estimativa noua (15% din venit)
        decimal rataEstimativaNoua = venitTotal * 0.15m;

        // Calculeaza rata totala existenta (din sold_total, aproximativ 5% pe an)
        decimal rataExistenta = request.SoldTotal.HasValue ? request.SoldTotal.Value * 0.05m / 12 : 0;

        // Adauga ratele din carduri de credit si descoperit
        if (!string.IsNullOrEmpty(request.CardCredit))
        {
            var cardCredit = JsonSerializer.Deserialize<List<CardCreditData>>(request.CardCredit);
            if (cardCredit != null)
            {
                foreach (var card in cardCredit)
                {
                    // Presupunem ca plata minima este 5% din limita
                    rataExistenta += card.Limita * 0.05m;
                }
            }
        }

        if (!string.IsNullOrEmpty(request.Overdraft))
        {
            var overdraft = JsonSerializer.Deserialize<List<OverdraftData>>(request.Overdraft);
            if (overdraft != null)
            {
                foreach (var od in overdraft)
                {
                    // Presupunem ca plata minima este 3% din limita
                    rataExistenta += od.Limita * 0.03m;
                }
            }
        }

        // Adauga venitul codebitorilor
        if (!string.IsNullOrEmpty(request.Codebitori))
        {
            var codebitori = JsonSerializer.Deserialize<List<CodebitorData>>(request.Codebitori);
            if (codebitori != null)
            {
                foreach (var codebitor in codebitori)
                {
                    venitTotal += codebitor.Venit;
                }
            }
        }

        // Calculeaza DTI
        decimal dti = (rataExistenta + rataEstimativaNoua) / venitTotal;

        // Aplica penalizari
        if (request.Intarzieri == true && request.IntarzieriNumar.HasValue)
        {
            if (request.IntarzieriNumar.Value >= 7)
            {
                return new ScoringResult
                {
                    Dti = dti,
                    ScoringLevel = "foarte_scazut",
                    RecommendedLevel = "0%",
                    Reasoning = new List<string> { "Prea multe intarzieri (7+)" }
                };
            }
            else if (request.IntarzieriNumar.Value >= 3)
            {
                dti += 0.10m;
            }
            else if (request.IntarzieriNumar.Value >= 1)
            {
                dti += 0.05m;
            }
        }

        // Penalizare IFN
        if (request.NrIfn.HasValue && request.NrIfn.Value > 0)
        {
            dti += request.NrIfn.Value * 0.02m;
        }

        // Verifica poprire
        if (request.Poprire == true)
        {
            return new ScoringResult
            {
                Dti = dti,
                ScoringLevel = "foarte_scazut",
                RecommendedLevel = "0%",
                Reasoning = new List<string> { "Poprire in ultimii 5 ani" }
            };
        }

        // Determina nivelul recomandat
        string recommendedLevel = "40%";
        string scoringLevel;

        if (dti <= 0.30m)
        {
            scoringLevel = "foarte_mare";
        }
        else if (dti <= 0.40m)
        {
            scoringLevel = "mare";
            if (request.Intarzieri == false && request.VechimeLuni.HasValue && request.VechimeLuni.Value > 12)
            {
                recommendedLevel = "50%";
            }
        }
        else if (dti <= 0.50m)
        {
            scoringLevel = "bun";
            recommendedLevel = "50%";
            if (request.Intarzieri == false &&
                request.VechimeLuni.HasValue && request.VechimeLuni.Value > 12 &&
                (!request.NrIfn.HasValue || request.NrIfn.Value == 0) &&
                (!request.NrCrediteBanci.HasValue || request.NrCrediteBanci.Value <= 1))
            {
                recommendedLevel = "55%";
            }
        }
        else if (dti <= 0.55m)
        {
            scoringLevel = "conditii_speciale";
            recommendedLevel = "55%";
        }
        else
        {
            scoringLevel = "foarte_scazut";
            recommendedLevel = "0%";
        }

        var reasoning = new List<string>();
        if (request.VechimeLuni.HasValue && request.VechimeLuni.Value > 12)
            reasoning.Add("Vechime buna la locul de munca");
        if (request.Intarzieri == false)
            reasoning.Add("Fara intarzieri");
        if (request.SoldTotal.HasValue && request.SoldTotal.Value < venitTotal * 6)
            reasoning.Add("Sold credite moderat");
        if (dti > 0.55m)
            reasoning.Add("DTI prea mare");

        return new ScoringResult
        {
            Dti = dti,
            ScoringLevel = scoringLevel,
            RecommendedLevel = recommendedLevel,
            Reasoning = reasoning
        };
    }
}

public class CardCreditData
{
    public string Banca { get; set; } = null!;
    public decimal Limita { get; set; }
}

public class OverdraftData
{
    public string Banca { get; set; } = null!;
    public decimal Limita { get; set; }
}

public class CodebitorData
{
    public string Nume { get; set; } = null!;
    public decimal Venit { get; set; }
    public string Relatie { get; set; } = null!;
    public int NrCredite { get; set; }
    public int Ifn { get; set; }
}
