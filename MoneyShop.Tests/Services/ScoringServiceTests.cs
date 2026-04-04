using MoneyShop.ServiceAdapters.Services.Simulator;
using MoneyShop.ServiceInterface.Interfaces.Simulator;
using FluentAssertions;
using System.Text.Json;

namespace MoneyShop.Tests.Services;

public class ScoringServiceTests
{
    private readonly ScoringService _service;

    public ScoringServiceTests()
    {
        _service = new ScoringService();
    }

    [Fact]
    public void CalculateScoring_BasicSalary_ReturnsFoarteMare()
    {
        var request = new ScoringRequest { SalariuNet = 5000m };
        var result = _service.CalculateScoring(request);
        result.ScoringLevel.Should().Be("foarte_mare");
        result.Dti.Should().BeLessThanOrEqualTo(0.30m);
    }

    [Fact]
    public void CalculateScoring_WithMealBonuses_IncreasesTotalIncome()
    {
        var request = new ScoringRequest
        {
            SalariuNet = 3000m,
            BonuriMasa = true,
            SumaBonuriMasa = 500m
        };
        var result = _service.CalculateScoring(request);
        result.Dti.Should().BeGreaterThan(0);
        result.ScoringLevel.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void CalculateScoring_WithExistingDebt_IncreaseDti()
    {
        var withoutDebt = _service.CalculateScoring(new ScoringRequest { SalariuNet = 5000m });
        var withDebt = _service.CalculateScoring(new ScoringRequest { SalariuNet = 5000m, SoldTotal = 100000m });
        withDebt.Dti.Should().BeGreaterThan(withoutDebt.Dti);
    }

    [Fact]
    public void CalculateScoring_SevenPlusDelays_ReturnsFoarteScazut()
    {
        var request = new ScoringRequest
        {
            SalariuNet = 5000m,
            Intarzieri = true,
            IntarzieriNumar = 7
        };
        var result = _service.CalculateScoring(request);
        result.ScoringLevel.Should().Be("foarte_scazut");
        result.RecommendedLevel.Should().Be("0%");
        result.Reasoning.Should().Contain("Prea multe intarzieri (7+)");
    }

    [Fact]
    public void CalculateScoring_ThreeToSixDelays_AddsTenPercentDti()
    {
        var noDelays = _service.CalculateScoring(new ScoringRequest { SalariuNet = 5000m });
        var withDelays = _service.CalculateScoring(new ScoringRequest
        {
            SalariuNet = 5000m,
            Intarzieri = true,
            IntarzieriNumar = 4
        });
        (withDelays.Dti - noDelays.Dti).Should().BeApproximately(0.10m, 0.001m);
    }

    [Fact]
    public void CalculateScoring_OneToTwoDelays_AddsFivePercentDti()
    {
        var noDelays = _service.CalculateScoring(new ScoringRequest { SalariuNet = 5000m });
        var withDelays = _service.CalculateScoring(new ScoringRequest
        {
            SalariuNet = 5000m,
            Intarzieri = true,
            IntarzieriNumar = 2
        });
        (withDelays.Dti - noDelays.Dti).Should().BeApproximately(0.05m, 0.001m);
    }

    [Fact]
    public void CalculateScoring_WithPoprire_ReturnsFoarteScazut()
    {
        var request = new ScoringRequest
        {
            SalariuNet = 10000m,
            Poprire = true
        };
        var result = _service.CalculateScoring(request);
        result.ScoringLevel.Should().Be("foarte_scazut");
        result.RecommendedLevel.Should().Be("0%");
        result.Reasoning.Should().Contain("Poprire in ultimii 5 ani");
    }

    [Fact]
    public void CalculateScoring_WithIfn_IncreasesDtiByTwoPercentEach()
    {
        var noIfn = _service.CalculateScoring(new ScoringRequest { SalariuNet = 5000m });
        var withIfn = _service.CalculateScoring(new ScoringRequest { SalariuNet = 5000m, NrIfn = 3 });
        (withIfn.Dti - noIfn.Dti).Should().BeApproximately(0.06m, 0.001m);
    }

    [Fact]
    public void CalculateScoring_HighIncome_NoDebt_ReturnsVeryHigh()
    {
        var request = new ScoringRequest
        {
            SalariuNet = 15000m,
            BonuriMasa = true,
            SumaBonuriMasa = 1000m,
            Intarzieri = false,
            VechimeLuni = 24
        };
        var result = _service.CalculateScoring(request);
        result.ScoringLevel.Should().Be("foarte_mare");
        result.Reasoning.Should().Contain("Vechime buna la locul de munca");
        result.Reasoning.Should().Contain("Fara intarzieri");
    }

    [Fact]
    public void CalculateScoring_WithCreditCards_IncreasesExistingDebt()
    {
        var cards = JsonSerializer.Serialize(new List<CardCreditData>
        {
            new() { Banca = "BCR", Limita = 10000m },
            new() { Banca = "BRD", Limita = 5000m }
        });
        var request = new ScoringRequest { SalariuNet = 5000m, CardCredit = cards };
        var result = _service.CalculateScoring(request);
        result.Dti.Should().BeGreaterThan(0.15m);
    }

    [Fact]
    public void CalculateScoring_WithOverdraft_IncreasesExistingDebt()
    {
        var overdrafts = JsonSerializer.Serialize(new List<OverdraftData>
        {
            new() { Banca = "BCR", Limita = 20000m }
        });
        var request = new ScoringRequest { SalariuNet = 5000m, Overdraft = overdrafts };
        var withOverdraft = _service.CalculateScoring(request);
        var without = _service.CalculateScoring(new ScoringRequest { SalariuNet = 5000m });
        withOverdraft.Dti.Should().BeGreaterThan(without.Dti);
    }

    [Fact]
    public void CalculateScoring_WithCoborrower_IncreasesIncome()
    {
        var codebitori = JsonSerializer.Serialize(new List<CodebitorData>
        {
            new() { Nume = "Partener", Venit = 3000m, Relatie = "sot", NrCredite = 0, Ifn = 0 }
        });
        var alone = _service.CalculateScoring(new ScoringRequest { SalariuNet = 3000m });
        var withPartner = _service.CalculateScoring(new ScoringRequest { SalariuNet = 3000m, Codebitori = codebitori });
        withPartner.Dti.Should().BeLessThan(alone.Dti);
    }

    [Fact]
    public void CalculateScoring_VeryHighDebt_ReturnsFoarteScazut()
    {
        var request = new ScoringRequest
        {
            SalariuNet = 2000m,
            SoldTotal = 500000m,
            NrCrediteBanci = 5,
            NrIfn = 3
        };
        var result = _service.CalculateScoring(request);
        result.ScoringLevel.Should().Be("foarte_scazut");
        result.RecommendedLevel.Should().Be("0%");
    }

    [Theory]
    [InlineData(10000, "foarte_mare")]
    [InlineData(3000, "foarte_mare")]
    [InlineData(1500, "foarte_mare")]
    public void CalculateScoring_VariousSalaries_NoDebt_AlwaysFoarteMare(decimal salary, string expected)
    {
        var result = _service.CalculateScoring(new ScoringRequest { SalariuNet = salary });
        result.ScoringLevel.Should().Be(expected);
    }

    [Fact]
    public void CalculateScoring_MediumDti_GoodProfile_ReturnsHigherRecommended()
    {
        var request = new ScoringRequest
        {
            SalariuNet = 4000m,
            SoldTotal = 80000m,
            Intarzieri = false,
            VechimeLuni = 24,
            NrIfn = 0,
            NrCrediteBanci = 1
        };
        var result = _service.CalculateScoring(request);
        result.Should().NotBeNull();
        result.Dti.Should().BeGreaterThan(0);
    }

    [Fact]
    public void CalculateScoring_ZeroSalary_ThrowsOrHandles()
    {
        var request = new ScoringRequest { SalariuNet = 0.01m };
        var act = () => _service.CalculateScoring(request);
        act.Should().NotThrow();
    }

    [Fact]
    public void CalculateScoring_ReturnsCorrectDtiFormula()
    {
        var request = new ScoringRequest { SalariuNet = 10000m };
        var result = _service.CalculateScoring(request);
        var expectedDti = (10000m * 0.15m) / 10000m;
        result.Dti.Should().BeApproximately(expectedDti, 0.001m);
    }
}
