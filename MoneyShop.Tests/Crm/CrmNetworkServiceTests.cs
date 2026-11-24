using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Tests.Crm;

public class CrmNetworkServiceTests
{
    private const int MsBroker = 11;
    private const int MsBroker2 = 12;
    private const int AffBroker = 13;
    private const int MsUser = 21;
    private const int AffUser = 23;

    private static (CrmNetworkService Svc, MoneyShopDbContext Db) Setup()
    {
        var options = new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new MoneyShopDbContext(options);
        db.BrokerProfiles.AddRange(
            Profile(MsBroker, MsUser, "ms1", BrokerTypes.MoneyShop),
            Profile(MsBroker2, 22, "ms2", BrokerTypes.MoneyShop),
            Profile(AffBroker, AffUser, "aff", BrokerTypes.Afiliat));
        db.Banks.AddRange(
            new MoneyShop.DomainModel.Entities.Bank { Name = "BT", Active = true, SortOrder = 1 },
            new MoneyShop.DomainModel.Entities.Bank { Name = "BCR", Active = true, SortOrder = 2 },
            new MoneyShop.DomainModel.Entities.Bank { Name = "ING", Active = true, SortOrder = 3 },
            new MoneyShop.DomainModel.Entities.Bank { Name = "Veche", Active = false, SortOrder = 4 });
        db.SaveChanges();
        return (new CrmNetworkService(db), db);
    }

    private static BrokerProfile Profile(int id, int userId, string slug, string type) => new()
    {
        Id = id,
        UserId = userId,
        Slug = slug,
        DisplayName = slug,
        Type = type,
        User = new Utilizatori { IdUtilizator = userId, Nume = slug, Prenume = slug, IdRol = 3 },
    };

    private static void File(MoneyShopDbContext db, int? broker, string bank, string? type, decimal amount, DateTime changedAt, string status = BankFileStatuses.Disbursat)
    {
        db.BankFiles.Add(new BankFile
        {
            BrokerProfileId = broker,
            UserId = 100,
            BankName = bank,
            CreditType = type,
            Amount = amount,
            Status = status,
            StatusChangedAt = changedAt,
            CreatedAt = changedAt,
            UpdatedAt = changedAt,
        });
        db.SaveChanges();
    }

    private static DateTime Mid(int monthsAgo) => DateTime.UtcNow.AddDays(-DateTime.UtcNow.Day + 15).AddMonths(-monthsAgo);

    [Fact]
    public void Admin_dashboard_splits_series_and_banks_by_broker_type()
    {
        var (svc, db) = Setup();
        File(db, MsBroker, "BT", "NP", 100m, Mid(0));
        File(db, MsBroker2, "BT", "IP", 50m, Mid(0));
        File(db, MsBroker, "BCR", "NP", 30m, Mid(1));
        File(db, AffBroker, "BT", "NP", 900m, Mid(0));
        File(db, AffBroker, "ING", "IP", 70m, Mid(2));

        var result = svc.GetAdminDashboard(12, null, null);

        Assert.Equal(12, result.MoneyShop.Series.Count);
        Assert.Equal(result.CurrentMonth, result.MoneyShop.Series.Last().Month);
        Assert.Equal(150m, result.MoneyShop.Series.Last().Amount);
        Assert.Equal(2, result.MoneyShop.Series.Last().Count);
        Assert.Equal(30m, result.MoneyShop.Series[^2].Amount);
        Assert.Equal(180m, result.MoneyShop.Series.Sum(p => p.Amount));
        Assert.Equal(new[] { "BT", "BCR", "ING" }, result.MoneyShop.Selected.Banks.Select(b => b.BankName));
        var bt = result.MoneyShop.Selected.Banks[0];
        Assert.Equal("BT", bt.BankName);
        Assert.Equal(100m, bt.NpAmount);
        Assert.Equal(50m, bt.IpAmount);

        Assert.Equal(970m, result.Affiliates.Series.Sum(p => p.Amount));
        Assert.Equal(900m, result.Affiliates.Series.Last().Amount);
        Assert.Equal(70m, result.Affiliates.Series[^3].Amount);
        Assert.Equal(900m, result.Affiliates.Selected.Total.Amount);
        Assert.Null(result.Affiliates.EstimatedCommission);
    }

    [Fact]
    public void Affiliates_never_leak_into_the_moneyshop_series_and_vice_versa()
    {
        var (svc, db) = Setup();
        File(db, AffBroker, "BT", "NP", 500m, Mid(0));
        var onlyAffiliate = svc.GetAdminDashboard(6, null, null);
        Assert.Equal(0m, onlyAffiliate.MoneyShop.Series.Sum(p => p.Amount));
        Assert.All(onlyAffiliate.MoneyShop.Selected.Banks, b => Assert.Equal(0m, b.Amount));
        Assert.Equal(500m, onlyAffiliate.Affiliates.Series.Sum(p => p.Amount));

        File(db, MsBroker, "BT", "NP", 40m, Mid(0));
        var both = svc.GetAdminDashboard(6, null, null);
        Assert.Equal(40m, both.MoneyShop.Series.Sum(p => p.Amount));
        Assert.Equal(500m, both.Affiliates.Series.Sum(p => p.Amount));
    }

    [Fact]
    public void Only_disbursed_files_inside_the_window_and_attributed_to_a_broker_count()
    {
        var (svc, db) = Setup();
        File(db, MsBroker, "BT", "NP", 10m, Mid(0));
        File(db, MsBroker, "BT", "NP", 999m, Mid(0), BankFileStatuses.Analiza);
        File(db, MsBroker, "BT", "NP", 888m, Mid(0), BankFileStatuses.Respins);
        File(db, MsBroker, "BT", "NP", 777m, Mid(20));
        File(db, null, "BT", "NP", 666m, Mid(0));

        var result = svc.GetAdminDashboard(12, null, null);

        Assert.Equal(10m, result.MoneyShop.Series.Sum(p => p.Amount));
        Assert.Equal(0m, result.Affiliates.Series.Sum(p => p.Amount));
    }

    [Fact]
    public void Active_brokers_are_counted_per_type_and_suspended_are_left_out()
    {
        var (svc, db) = Setup();
        db.BrokerProfiles.Single(p => p.Id == MsBroker2).Status = "Suspended";
        db.SaveChanges();

        var result = svc.GetAdminDashboard(12, null, null);

        Assert.Equal(1, result.MoneyShop.ActiveBrokers);
        Assert.Equal(1, result.Affiliates.ActiveBrokers);
    }

    [Fact]
    public void Selected_month_drives_the_bank_breakdown()
    {
        var (svc, db) = Setup();
        var prev = Mid(1);
        File(db, MsBroker, "BCR", "IP", 30m, prev);
        File(db, MsBroker, "BT", "NP", 100m, Mid(0));

        var result = svc.GetAdminDashboard(12, prev.Year, prev.Month);

        var bank = result.MoneyShop.Selected.Banks[1];
        Assert.Equal("BCR", bank.BankName);
        Assert.Equal(0m, result.MoneyShop.Selected.Banks[0].Amount);
        Assert.Equal(30m, bank.Amount);
    }

    [Fact]
    public void Admin_dashboard_refuses_a_broker_scope_and_a_malformed_month()
    {
        var (svc, db) = Setup();
        Assert.Throws<InvalidOperationException>(() => svc.GetAdminDashboard(12, 2026, 13));
        db.BrokerScopeId = MsBroker;
        Assert.Throws<InvalidOperationException>(() => svc.GetAdminDashboard(12, null, null));
    }

    [Fact]
    public void Moneyshop_broker_sees_the_network_totals_without_other_brokers_files()
    {
        var (svc, db) = Setup();
        File(db, MsBroker, "BT", "NP", 100m, Mid(0));
        File(db, MsBroker2, "BT", "IP", 50m, Mid(0));
        File(db, MsBroker2, "BCR", "NP", 25m, Mid(0));
        File(db, AffBroker, "BT", "NP", 900m, Mid(0));
        File(db, MsBroker2, "BT", "NP", 77m, Mid(1));
        db.BrokerScopeId = MsBroker;

        var summary = svc.GetNetwork(MsUser, false, null, null);

        Assert.NotNull(summary);
        Assert.Equal(175m, summary!.Total.Amount);
        Assert.Equal(3, summary.Total.Count);
        Assert.Equal(new[] { "BT", "BCR", "ING" }, summary.Banks.Select(b => b.BankName));
        Assert.Equal(0m, summary.Banks[2].Amount);
        Assert.Equal(150m, summary.Banks[0].Amount);
    }

    [Fact]
    public void Network_refuses_future_months_and_serves_the_admin_without_a_broker_profile()
    {
        var (svc, db) = Setup();
        File(db, MsBroker, "BT", "NP", 100m, Mid(1));
        var next = DateTime.UtcNow.AddMonths(1);
        Assert.Throws<InvalidOperationException>(() => svc.GetNetwork(1, true, next.Year, next.Month));
        var prev = Mid(1);
        var summary = svc.GetNetwork(1, true, prev.Year, prev.Month);
        Assert.Equal(100m, summary!.Total.Amount);
    }

    [Fact]
    public void Affiliate_and_unknown_callers_get_no_network()
    {
        var (svc, db) = Setup();
        File(db, MsBroker, "BT", "NP", 100m, Mid(0));
        db.BrokerScopeId = AffBroker;

        Assert.Null(svc.GetNetwork(AffUser, false, null, null));
        Assert.Null(svc.GetNetwork(999, false, null, null));
    }
}
