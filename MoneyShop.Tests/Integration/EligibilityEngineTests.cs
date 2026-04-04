using MoneyShop.ServiceAdapters.Services.Simulator;
using MoneyShop.ServiceInterface.Interfaces.Simulator;
using FluentAssertions;
using System.Text.Json;

namespace MoneyShop.Tests.Integration;

public class EligibilityEngineTests
{
    private readonly ScoringService _scoringService;

    public EligibilityEngineTests()
    {
        _scoringService = new ScoringService();
    }

    [Fact]
    public void FullScenario_YoungProfessional_GoodScore()
    {
        var request = new ScoringRequest
        {
            SalariuNet = 6000m,
            BonuriMasa = true,
            SumaBonuriMasa = 600m,
            VechimeLuni = 36,
            Intarzieri = false,
            NrCrediteBanci = 0,
            NrIfn = 0,
            Poprire = false,
            SoldTotal = 0
        };
        var result = _scoringService.CalculateScoring(request);
        result.ScoringLevel.Should().Be("foarte_mare");
        result.Reasoning.Should().Contain("Vechime buna la locul de munca");
        result.Reasoning.Should().Contain("Fara intarzieri");
    }

    [Fact]
    public void FullScenario_FamilyWithExistingMortgage_MediumScore()
    {
        var codebitori = JsonSerializer.Serialize(new List<CodebitorData>
        {
            new() { Nume = "Partener", Venit = 4000m, Relatie = "sot", NrCredite = 0, Ifn = 0 }
        });
        var request = new ScoringRequest
        {
            SalariuNet = 5000m,
            BonuriMasa = true,
            SumaBonuriMasa = 500m,
            VechimeLuni = 60,
            Intarzieri = false,
            NrCrediteBanci = 1,
            NrIfn = 0,
            Poprire = false,
            SoldTotal = 200000m,
            Codebitori = codebitori
        };
        var result = _scoringService.CalculateScoring(request);
        result.ScoringLevel.Should().NotBe("foarte_scazut");
        result.Dti.Should().BeGreaterThan(0);
    }

    [Fact]
    public void FullScenario_HighRiskClient_LowScore()
    {
        var cards = JsonSerializer.Serialize(new List<CardCreditData>
        {
            new() { Banca = "BCR", Limita = 15000m },
            new() { Banca = "BRD", Limita = 10000m }
        });
        var overdrafts = JsonSerializer.Serialize(new List<OverdraftData>
        {
            new() { Banca = "ING", Limita = 20000m }
        });
        var request = new ScoringRequest
        {
            SalariuNet = 3000m,
            VechimeLuni = 6,
            Intarzieri = true,
            IntarzieriNumar = 5,
            NrCrediteBanci = 3,
            NrIfn = 2,
            Poprire = false,
            SoldTotal = 80000m,
            CardCredit = cards,
            Overdraft = overdrafts
        };
        var result = _scoringService.CalculateScoring(request);
        result.ScoringLevel.Should().Be("foarte_scazut");
        result.RecommendedLevel.Should().Be("0%");
    }
}
