using System;
using System.Linq;
using System.Text.Json;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Dtos.BcReport;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Tests.Crm;

public class CrmServiceIncomeTests
{
    private const int Client = CrmServiceClientUnionTests.AcordOnlyUser;

    private static void AddBcReport(MoneyShop.Infrastructure.EntityFramework.DBContext.MoneyShopDbContext db, decimal obligations)
    {
        db.BcReports.Add(new BcReport
        {
            UserId = Client,
            ReportId = Guid.NewGuid().ToString("N"),
            ExistingMonthlyObligations = obligations,
            ParsedDataJson = JsonSerializer.Serialize(new BcParsedData()),
            CreatedAt = new DateTime(2026, 11, 15),
        });
        db.SaveChanges();
    }

    [Fact]
    public void Income_is_the_average_salary_plus_meal_tickets_and_dti_uses_the_bc_obligations()
    {
        var (service, db) = CrmServiceClientUnionTests.Build();
        AddBcReport(db, 1_200m);

        var income = service.SaveClientIncome(Client, new CrmIncomeInput
        {
            Salariu1 = 5_000m, Salariu2 = 5_200m, Salariu3 = 4_800m, BonuriMasa = 800m,
        });

        Assert.Equal(5_000m, income.SalariuNet);
        Assert.Equal(5_800m, income.VenitTotal);
        Assert.Equal(1_200m, income.RataTotalaLunara);
        Assert.Equal(0.2069m, income.Dti);
        var row = db.UserFinancialData.Single(f => f.UserId == Client);
        Assert.True(row.BonuriMasa);
        Assert.Equal(5_800m, row.VenitTotal);
    }

    [Fact]
    public void Empty_months_are_left_out_of_the_average_and_no_bc_means_no_dti()
    {
        var (service, _) = CrmServiceClientUnionTests.Build();

        var income = service.SaveClientIncome(Client, new CrmIncomeInput { Salariu1 = 6_000m, Salariu2 = 0, Salariu3 = null });

        Assert.Equal(6_000m, income.SalariuNet);
        Assert.Equal(6_000m, income.VenitTotal);
        Assert.Null(income.Dti);
        Assert.Null(income.BonuriMasa);
    }

    [Fact]
    public void Saving_again_updates_the_same_row_and_shows_on_the_client_page()
    {
        var (service, db) = CrmServiceClientUnionTests.Build();

        service.SaveClientIncome(Client, new CrmIncomeInput { Salariu1 = 4_000m });
        service.SaveClientIncome(Client, new CrmIncomeInput { Salariu1 = 4_500m, Salariu2 = 4_500m });

        Assert.Single(db.UserFinancialData.Where(f => f.UserId == Client));
        Assert.Equal(4_500m, service.GetClient(Client)!.Income!.SalariuNet);
    }

    [Fact]
    public void Visibility_follows_the_broker_scope()
    {
        var (service, _) = CrmServiceClientUnionTests.Build();

        Assert.True(service.IsClientVisible(CrmServiceClientUnionTests.AcordOnlyUser));
        Assert.True(service.IsClientVisible(CrmServiceClientUnionTests.FileOnlyUser));
        Assert.False(service.IsClientVisible(CrmServiceClientUnionTests.OtherBrokerUser));
        Assert.False(service.IsClientVisible(999));
    }
}
