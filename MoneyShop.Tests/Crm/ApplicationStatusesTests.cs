using System.Linq;
using MoneyShop.ServiceInterface.SharedDtos;

namespace MoneyShop.Tests.Crm;

public class ApplicationStatusesTests
{
    [Fact]
    public void Disbursat_HasNoTargets()
    {
        Assert.Empty(ApplicationStatuses.TransitionMap[ApplicationStatuses.DISBURSAT]);
    }

    [Fact]
    public void Respins_CanOnlyReturnToInAnaliza()
    {
        Assert.Equal(new[] { ApplicationStatuses.IN_ANALIZA }, ApplicationStatuses.TransitionMap[ApplicationStatuses.RESPINS]);
    }

    [Fact]
    public void Preaprobat_CanGoBackToNevoieDocumente()
    {
        Assert.True(ApplicationStatuses.CanTransition(ApplicationStatuses.PREAPROBAT, ApplicationStatuses.NEVOIE_DOCUMENTE));
        Assert.Contains(ApplicationStatuses.NEVOIE_DOCUMENTE, ApplicationStatuses.TransitionMap[ApplicationStatuses.PREAPROBAT]);
    }

    [Fact]
    public void InregistratIsNeverATarget()
    {
        Assert.DoesNotContain(ApplicationStatuses.TransitionMap.Values, t => t.Contains(ApplicationStatuses.INREGISTRAT));
    }

    [Fact]
    public void TransitionMap_AgreesWithCanTransition_ForEveryPair()
    {
        foreach (var from in ApplicationStatuses.All)
        {
            foreach (var to in ApplicationStatuses.All)
            {
                var inMap = ApplicationStatuses.TransitionMap[from].Contains(to);
                Assert.Equal(ApplicationStatuses.CanTransition(from, to), inMap);
            }
        }
    }

    [Fact]
    public void TransitionMap_TargetsAreOrderedByPipeline()
    {
        var targets = ApplicationStatuses.TransitionMap[ApplicationStatuses.INREGISTRAT];
        Assert.Equal(ApplicationStatuses.IN_ANALIZA, targets.First());
        Assert.Equal(ApplicationStatuses.RESPINS, targets.Last());
    }
}
