using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Crm;
using static MoneyShop.Tests.Crm.CrmServiceClientUnionTests;
using static MoneyShop.Tests.Crm.CrmWorkServiceTests;

namespace MoneyShop.Tests.Crm;

public class BankCatalogServiceTests
{
    private const int AdminUserId = 1;
    private const int BrokerUserId = 2;

    private static (BankCatalogService Banks, CrmWorkService Work, MoneyShopDbContext Db) Setup()
    {
        var options = new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new MoneyShopDbContext(options);
        db.BrokerProfiles.AddRange(Profile(BrokerId, BrokerUserId, "Alex"), Profile(OtherBrokerId, 3, "Maria"));
        db.SaveChanges();
        db.BrokerScopeId = BrokerId;
        return (new BankCatalogService(db), new CrmWorkService(db), db);
    }

    private static BrokerProfile Profile(int id, int userId, string name) => new()
    {
        Id = id,
        UserId = userId,
        Slug = name.ToLowerInvariant(),
        DisplayName = name,
        User = new Utilizatori { IdUtilizator = userId, Nume = name, Prenume = name, IdRol = 1 },
    };

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

    [Fact]
    public void Stats_split_by_credit_type_respect_the_month_boundary_and_skip_rejected_files()
    {
        var (banks, _, db) = Setup();
        var bt = SeedBank(db, "BT");
        db.Banks.Single(b => b.Id == bt).MonthlyThresholdAmount = 1_000_000m;
        db.SaveChanges();
        var ro = TimeZoneInfo.FindSystemTimeZoneById("Europe/Bucharest");
        var novStart = TimeZoneInfo.ConvertTimeToUtc(new DateTime(2026, 11, 1), ro);

        File(db, BrokerId, bt, "NP", 100m, BankFileStatuses.Disbursat, novStart);
        File(db, BrokerId, bt, "IP", 200m, BankFileStatuses.Disbursat, novStart.AddDays(10));
        File(db, OtherBrokerId, bt, "NP", 400m, BankFileStatuses.Disbursat, novStart.AddDays(5));
        File(db, OtherBrokerId, bt, null, 50m, BankFileStatuses.Disbursat, novStart.AddDays(6));
        File(db, BrokerId, bt, "NP", 999m, BankFileStatuses.Disbursat, novStart.AddTicks(-1));
        File(db, BrokerId, bt, "NP", 888m, BankFileStatuses.Disbursat, novStart.AddMonths(1));
        File(db, BrokerId, bt, "NP", 777m, BankFileStatuses.Respins, novStart.AddDays(3));
        File(db, BrokerId, bt, "NP", 30m, BankFileStatuses.Analiza, novStart.AddMonths(-3));
        File(db, OtherBrokerId, bt, "IP", 70m, BankFileStatuses.Trimis, novStart.AddDays(2));

        var stats = banks.GetStats(BrokerUserId, "2026-11", false);

        var row = Assert.Single(stats.Banks);
        Assert.Equal(1_000_000m, row.Threshold);
        Assert.Equal(750m, row.Network.DisbursedAmount);
        Assert.Equal(4, row.Network.DisbursedCount);
        Assert.Equal(500m, row.Network.NpAmount);
        Assert.Equal(200m, row.Network.IpAmount);
        Assert.Equal(50m, row.Network.UnknownAmount);
        Assert.Equal(1, row.Network.UnknownCount);
        Assert.Equal(100m, row.Network.InProgressAmount);
        Assert.Equal(2, row.Network.InProgressCount);
        Assert.Equal(300m, row.Mine.DisbursedAmount);
        Assert.Equal(2, row.Mine.DisbursedCount);
        Assert.Equal(100m, row.Mine.NpAmount);
        Assert.Equal(200m, row.Mine.IpAmount);
        Assert.Equal(30m, row.Mine.InProgressAmount);
    }

    [Fact]
    public void Commission_uses_the_brokers_override_and_falls_back_to_the_bank_default()
    {
        var (banks, _, db) = Setup();
        var bt = SeedBank(db, "BT");
        var bcr = SeedBank(db, "BCR");
        db.Banks.Single(b => b.Id == bt).CommissionPercent = 1.5m;
        db.Banks.Single(b => b.Id == bcr).CommissionPercent = 2m;
        db.SaveChanges();
        var now = DateTime.UtcNow;
        File(db, BrokerId, bt, "NP", 10_000m, BankFileStatuses.Disbursat, now);
        File(db, BrokerId, bcr, "NP", 10_000m, BankFileStatuses.Disbursat, now);

        banks.SetMyCommission(BrokerUserId, bt, 3m);

        var stats = banks.GetStats(BrokerUserId, null, false);
        var btRow = stats.Banks.Single(b => b.BankId == bt);
        Assert.Equal(3m, btRow.Mine.CommissionPercent);
        Assert.Equal(300m, btRow.Mine.EstimatedCommission);
        var bcrRow = stats.Banks.Single(b => b.BankId == bcr);
        Assert.Equal(2m, bcrRow.Mine.CommissionPercent);
        Assert.Equal(200m, bcrRow.Mine.EstimatedCommission);

        var mine = banks.GetMyCommissions(BrokerUserId);
        Assert.Equal(3m, mine.Single(c => c.BankId == bt).MyPercent);
        Assert.Null(mine.Single(c => c.BankId == bcr).MyPercent);

        banks.SetMyCommission(BrokerUserId, bt, null);
        Assert.Null(banks.GetMyCommissions(BrokerUserId).Single(c => c.BankId == bt).MyPercent);
        Assert.Throws<InvalidOperationException>(() => banks.SetMyCommission(BrokerUserId, bt, 101m));
    }

    [Fact]
    public void Only_the_super_admin_gets_the_per_broker_breakdown()
    {
        var (banks, _, db) = Setup();
        var bt = SeedBank(db, "BT");
        var now = DateTime.UtcNow;
        File(db, BrokerId, bt, "NP", 100m, BankFileStatuses.Disbursat, now);
        File(db, OtherBrokerId, bt, "IP", 300m, BankFileStatuses.Disbursat, now);

        Assert.Null(banks.GetStats(BrokerUserId, null, false).ByBroker);

        db.BrokerScopeId = null;
        var admin = banks.GetStats(AdminUserId, null, true);
        Assert.False(admin.HasBrokerProfile);
        Assert.Equal(0m, admin.Banks.Single().Mine.DisbursedAmount);
        Assert.Equal(400m, admin.Banks.Single().Network.DisbursedAmount);
        Assert.NotNull(admin.ByBroker);
        Assert.Equal(new[] { "Maria", "Alex" }, admin.ByBroker!.Select(b => b.BrokerName).ToArray());
        Assert.Equal(300m, admin.ByBroker![0].IpAmount);
        Assert.Throws<InvalidOperationException>(() => banks.SetMyCommission(AdminUserId, bt, 1m));
    }

    [Fact]
    public void Bank_files_need_an_active_catalog_bank_and_a_valid_credit_type()
    {
        var (_, work, db) = Setup();
        var active = SeedBank(db, "BT");
        var inactive = SeedBank(db, "Veche", false);
        Func<int?, string?, CrmBankFileInput> input = (bank, type) =>
            new CrmBankFileInput { BankId = bank, CreditType = type, Amount = 100, Status = BankFileStatuses.Trimis };

        Assert.Throws<InvalidOperationException>(() => work.AddBankFile(BothUser, input(inactive, "NP")));
        Assert.Throws<InvalidOperationException>(() => work.AddBankFile(BothUser, input(9999, "NP")));
        Assert.Throws<InvalidOperationException>(() => work.AddBankFile(BothUser, input(null, "NP")));
        Assert.Throws<InvalidOperationException>(() => work.AddBankFile(BothUser, input(active, null)));
        Assert.Throws<InvalidOperationException>(() => work.AddBankFile(BothUser, input(active, "XX")));

        var file = work.AddBankFile(BothUser, input(active, "IP"));
        Assert.Equal("BT", file.BankName);
        Assert.Equal(active, file.BankId);
        Assert.Equal("IP", file.CreditType);
    }

    [Fact]
    public void Legacy_files_without_bank_or_type_load_and_need_both_to_be_edited()
    {
        var (_, work, db) = Setup();
        var now = DateTime.UtcNow;
        db.BankFiles.Add(new BankFile { BrokerProfileId = BrokerId, UserId = BothUser, BankName = "BCR", Amount = 5, Status = BankFileStatuses.Trimis, StatusChangedAt = now, CreatedAt = now, UpdatedAt = now });
        db.SaveChanges();
        var id = db.BankFiles.Single().Id;
        var item = work.GetBoard().BankFiles.Single();
        Assert.Null(item.BankId);
        Assert.Null(item.CreditType);

        Assert.Throws<InvalidOperationException>(() => work.UpdateBankFile(id, new CrmBankFileInput { Amount = 5, Status = BankFileStatuses.Trimis }));
        var bank = SeedBank(db, "BCR");
        var updated = work.UpdateBankFile(id, new CrmBankFileInput { BankId = bank, CreditType = "NP", Amount = 5, Status = BankFileStatuses.Trimis });
        Assert.Equal("NP", updated!.CreditType);
    }

    [Fact]
    public void Catalog_names_are_unique_ignoring_case_and_banks_are_deactivated_not_deleted()
    {
        var (banks, _, _) = Setup();
        var bt = banks.CreateBank(new BankCatalogInput { Name = "  Banca Test ", CommissionPercent = 1m, MonthlyThresholdAmount = 5000m, SortOrder = 2 });
        Assert.Equal("Banca Test", bt.Name);

        Assert.Throws<InvalidOperationException>(() => banks.CreateBank(new BankCatalogInput { Name = "banca test" }));
        Assert.Throws<InvalidOperationException>(() => banks.CreateBank(new BankCatalogInput { Name = new string('a', 101) }));
        Assert.Throws<InvalidOperationException>(() => banks.CreateBank(new BankCatalogInput { Name = "Alta", CommissionPercent = 120m }));
        Assert.Throws<InvalidOperationException>(() => banks.CreateBank(new BankCatalogInput { Name = "Alta", MonthlyThresholdAmount = -1m }));

        var off = banks.UpdateBank(bt.Id, new BankCatalogInput { Name = "Banca Test", Active = false });
        Assert.False(off!.Active);
        Assert.Empty(banks.GetActiveBanks());
        Assert.Single(banks.GetAllBanks());
        Assert.Null(banks.UpdateBank(999, new BankCatalogInput { Name = "Z" }));
    }
}
