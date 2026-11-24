using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Broker;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.ServiceInterface.Interfaces.Crm;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using static MoneyShop.Tests.Crm.CrmServiceClientUnionTests;
using static MoneyShop.Tests.Crm.CrmWorkServiceTests;

namespace MoneyShop.Tests.Crm;

public class CrmTargetsServiceTests
{
    private const int BrokerUserId = 2;
    private static readonly TimeZoneInfo Ro = TimeZoneInfo.FindSystemTimeZoneById("Europe/Bucharest");

    private static MoneyShopDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new MoneyShopDbContext(options);
        db.BrokerProfiles.AddRange(Profile(BrokerId, BrokerUserId, "Alex"), Profile(OtherBrokerId, 3, "Maria"));
        db.SaveChanges();
        db.BrokerScopeId = BrokerId;
        return db;
    }

    private static BrokerProfile Profile(int id, int userId, string name) => new()
    {
        Id = id,
        UserId = userId,
        Slug = name.ToLowerInvariant(),
        DisplayName = name,
        User = new Utilizatori { IdUtilizator = userId, Nume = name, Prenume = name, IdRol = 3 },
    };

    private static DateTime MidMonth(int monthsAgo = 0)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ro);
        var day = new DateTime(local.Year, local.Month, 15, 12, 0, 0).AddMonths(-monthsAgo);
        return TimeZoneInfo.ConvertTimeToUtc(day, Ro);
    }

    private static void File(MoneyShopDbContext db, int broker, int bankId, string? type, decimal amount, string status, DateTime changedAt)
    {
        db.BankFiles.Add(new BankFile
        {
            BrokerProfileId = broker,
            UserId = 100 + broker,
            BankId = bankId,
            BankName = "x",
            CreditType = type,
            Amount = amount,
            Status = status,
            StatusChangedAt = changedAt,
            CreatedAt = changedAt,
            UpdatedAt = changedAt,
        });
        db.SaveChanges();
    }

    private static CrmTargetsService Targets(MoneyShopDbContext db) => new(db, new BankCatalogService(db));

    [Fact]
    public void Achieved_is_split_by_credit_type_and_counts_only_this_months_disbursements_of_the_caller()
    {
        var db = NewDb();
        var bt = SeedBank(db, "BT");
        File(db, BrokerId, bt, "NP", 100m, BankFileStatuses.Disbursat, MidMonth());
        File(db, BrokerId, bt, "NP", 50m, BankFileStatuses.Disbursat, MidMonth());
        File(db, BrokerId, bt, "IP", 200m, BankFileStatuses.Disbursat, MidMonth());
        File(db, BrokerId, bt, "NP", 999m, BankFileStatuses.Disbursat, MidMonth(2));
        File(db, BrokerId, bt, "IP", 888m, BankFileStatuses.Analiza, MidMonth());
        File(db, BrokerId, bt, "IP", 777m, BankFileStatuses.Respins, MidMonth());
        File(db, OtherBrokerId, bt, "NP", 400m, BankFileStatuses.Disbursat, MidMonth());

        var result = Targets(db).GetMine(BrokerUserId)!;

        Assert.Equal(150m, result.Np.Achieved);
        Assert.Equal(200m, result.Ip.Achieved);
    }

    [Fact]
    public void Commission_comes_from_the_bank_stats_estimate()
    {
        var db = NewDb();
        var bt = SeedBank(db, "BT");
        db.Banks.Single(b => b.Id == bt).CommissionPercent = 2m;
        db.SaveChanges();
        File(db, BrokerId, bt, "NP", 1000m, BankFileStatuses.Disbursat, MidMonth());
        File(db, BrokerId, bt, "IP", 500m, BankFileStatuses.Disbursat, MidMonth());

        var result = Targets(db).GetMine(BrokerUserId)!;

        Assert.Equal(30m, result.Commission.Achieved);
    }

    [Fact]
    public void New_profiles_get_the_default_targets()
    {
        var db = NewDb();

        var result = Targets(db).GetMine(BrokerUserId)!;

        Assert.Equal(5_000_000m, result.Np.Target);
        Assert.Equal(5_000_000m, result.Ip.Target);
        Assert.Equal(150_000m, result.Commission.Target);
        Assert.Equal(0m, result.Np.Achieved);
    }

    [Fact]
    public void A_caller_without_a_broker_profile_gets_nothing()
    {
        var db = NewDb();

        Assert.Null(Targets(db).GetMine(999));
    }

    private static BrokerProfileService Profiles(MoneyShopDbContext db) =>
        new(db, new ConfigurationBuilder().Build(), NullLogger<BrokerProfileService>.Instance);

    [Fact]
    public void Self_update_saves_the_targets_and_the_profile_view_returns_them()
    {
        var db = NewDb();
        var svc = Profiles(db);

        var saved = svc.UpdateOwn(BrokerUserId, new BrokerSelfUpdateInput { TargetNpAmount = 3_000_000m, TargetIpAmount = 4_500_000.5m, TargetCommissionAmount = 90_000m });

        Assert.True(saved.Success);
        var view = svc.GetForUser(BrokerUserId)!;
        Assert.Equal(3_000_000m, view.TargetNpAmount);
        Assert.Equal(4_500_000.5m, view.TargetIpAmount);
        Assert.Equal(90_000m, view.TargetCommissionAmount);
    }

    [Fact]
    public void Self_update_leaves_untouched_targets_alone()
    {
        var db = NewDb();
        var svc = Profiles(db);

        Assert.True(svc.UpdateOwn(BrokerUserId, new BrokerSelfUpdateInput { Bio = "salut" }).Success);

        var view = svc.GetForUser(BrokerUserId)!;
        Assert.Equal(5_000_000m, view.TargetNpAmount);
        Assert.Equal(150_000m, view.TargetCommissionAmount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(1_000_000_000.01)]
    public void Self_update_rejects_targets_outside_the_allowed_range(double value)
    {
        var db = NewDb();
        var svc = Profiles(db);
        var amount = (decimal)value;

        Assert.False(svc.UpdateOwn(BrokerUserId, new BrokerSelfUpdateInput { TargetNpAmount = amount }).Success);
        Assert.False(svc.UpdateOwn(BrokerUserId, new BrokerSelfUpdateInput { TargetIpAmount = amount }).Success);
        Assert.False(svc.UpdateOwn(BrokerUserId, new BrokerSelfUpdateInput { TargetCommissionAmount = amount }).Success);
        Assert.Equal(5_000_000m, svc.GetForUser(BrokerUserId)!.TargetNpAmount);
    }

    [Fact]
    public void Self_update_accepts_the_upper_bound()
    {
        var db = NewDb();
        var svc = Profiles(db);

        Assert.True(svc.UpdateOwn(BrokerUserId, new BrokerSelfUpdateInput { TargetNpAmount = 1_000_000_000m }).Success);
    }
}
