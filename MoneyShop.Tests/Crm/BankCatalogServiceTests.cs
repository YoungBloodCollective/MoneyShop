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
        return (new BankCatalogService(db), new CrmWorkService(db, new NoReferralNotifier()), db);
    }

    private static BankCatalogInput In(string name, decimal percent = 0m, decimal? threshold = null, bool active = true) =>
        new() { Name = name, Active = active, CommissionPercent = percent, MonthlyThresholdAmount = threshold, SortOrder = 0 };

    private static BrokerProfile Profile(int id, int userId, string name) => new()
    {
        Id = id,
        UserId = userId,
        Slug = name.ToLowerInvariant(),
        DisplayName = name,
        Type = BrokerTypes.MoneyShop,
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

        var brokerRow = Assert.Single(banks.GetStats(BrokerUserId, "2026-11", false).Banks);
        Assert.Equal(750m, brokerRow.Network.DisbursedAmount);
        Assert.Null(brokerRow.Network.DisbursedCount);
        Assert.Null(brokerRow.Network.NpAmount);
        Assert.Null(brokerRow.Network.IpCount);
        Assert.Null(brokerRow.Network.UnknownAmount);
        Assert.Null(brokerRow.Network.InProgressAmount);
        Assert.Null(brokerRow.Network.InProgressCount);
        Assert.Equal(300m, brokerRow.Mine.DisbursedAmount);

        var stats = banks.GetStats(BrokerUserId, "2026-11", true);
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

        banks.SetMyCommission(BrokerUserId, bt, null, 3m);

        var stats = banks.GetStats(BrokerUserId, null, false);
        var btRow = stats.Banks.Single(b => b.BankId == bt);
        Assert.Equal(3m, btRow.Mine.CommissionPercent);
        Assert.Equal(300m, btRow.Mine.EstimatedCommission);
        var bcrRow = stats.Banks.Single(b => b.BankId == bcr);
        Assert.Equal(2m, bcrRow.Mine.CommissionPercent);
        Assert.Equal(200m, bcrRow.Mine.EstimatedCommission);

        var mine = banks.GetMyCommissions(BrokerUserId);
        Assert.Equal(3m, mine.Single(c => c.BankId == bt).MyNpPercent);
        Assert.Equal(3m, mine.Single(c => c.BankId == bt).MyIpPercent);
        Assert.Null(mine.Single(c => c.BankId == bcr).MyNpPercent);

        banks.SetMyCommission(BrokerUserId, bt, null, null);
        Assert.Null(banks.GetMyCommissions(BrokerUserId).Single(c => c.BankId == bt).MyNpPercent);
        Assert.Throws<InvalidOperationException>(() => banks.SetMyCommission(BrokerUserId, bt, "NP", 101m));
        Assert.Throws<InvalidOperationException>(() => banks.SetMyCommission(BrokerUserId, bt, "XX", 1m));
    }

    [Fact]
    public void Commission_is_set_separately_for_personal_loans_and_mortgages()
    {
        var (banks, _, db) = Setup();
        var bt = SeedBank(db, "BT");
        db.Banks.Single(b => b.Id == bt).CommissionPercent = 1m;
        db.SaveChanges();
        var now = DateTime.UtcNow;
        File(db, BrokerId, bt, "NP", 10_000m, BankFileStatuses.Disbursat, now);
        File(db, BrokerId, bt, "IP", 100_000m, BankFileStatuses.Disbursat, now);

        banks.SetMyCommission(BrokerUserId, bt, "NP", 3m);
        var item = banks.SetMyCommission(BrokerUserId, bt, "IP", 0.5m)!;
        Assert.Equal(3m, item.MyNpPercent);
        Assert.Equal(0.5m, item.MyIpPercent);

        var row = banks.GetStats(BrokerUserId, null, false).Banks.Single(b => b.BankId == bt);
        Assert.Equal(3m, row.Mine.NpPercent);
        Assert.Equal(0.5m, row.Mine.IpPercent);
        Assert.Equal(300m + 500m, row.Mine.EstimatedCommission);

        banks.SetMyCommission(BrokerUserId, bt, "IP", null);
        var after = banks.GetMyCommissions(BrokerUserId).Single(c => c.BankId == bt);
        Assert.Equal(3m, after.MyNpPercent);
        Assert.Null(after.MyIpPercent);
        Assert.Equal(1m, banks.GetStats(BrokerUserId, null, false).Banks.Single(b => b.BankId == bt).Mine.IpPercent);
    }

    [Fact]
    public void A_commission_saved_before_the_split_applies_to_both_until_one_is_changed()
    {
        var (banks, _, db) = Setup();
        var bt = SeedBank(db, "BT");
        db.BrokerBankCommissions.Add(new BrokerBankCommission { BrokerProfileId = BrokerId, BankId = bt, CommissionPercent = 2m, UpdatedAt = DateTime.UtcNow });
        db.SaveChanges();

        var before = banks.GetMyCommissions(BrokerUserId).Single(c => c.BankId == bt);
        Assert.Equal(2m, before.MyNpPercent);
        Assert.Equal(2m, before.MyIpPercent);

        var item = banks.SetMyCommission(BrokerUserId, bt, "IP", 0.8m)!;
        Assert.Equal(2m, item.MyNpPercent);
        Assert.Equal(0.8m, item.MyIpPercent);
        Assert.DoesNotContain(db.BrokerBankCommissions.AsNoTracking().ToList(), c => c.CreditType == null);
        Assert.Equal(2, db.BrokerBankCommissions.AsNoTracking().Count(c => c.BrokerProfileId == BrokerId && c.BankId == bt));
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
        Assert.Throws<InvalidOperationException>(() => banks.SetMyCommission(AdminUserId, bt, null, 1m));
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
        var bt = banks.CreateBank(In("  Banca Test ", 1m, 5000m));
        Assert.Equal("Banca Test", bt.Name);

        Assert.Throws<InvalidOperationException>(() => banks.CreateBank(In("banca test")));
        Assert.Throws<InvalidOperationException>(() => banks.CreateBank(In(new string('a', 101))));
        Assert.Throws<InvalidOperationException>(() => banks.CreateBank(In("Alta", 120m)));
        Assert.Throws<InvalidOperationException>(() => banks.CreateBank(In("Alta", 0m, -1m)));

        var off = banks.UpdateBank(bt.Id, In("Banca Test", 1m, 5000m, false));
        Assert.Throws<InvalidOperationException>(() => banks.UpdateBank(bt.Id, new BankCatalogInput { Name = "Banca Test" }));
        Assert.False(off!.Active);
        Assert.Empty(banks.GetActiveBanks());
        Assert.Single(banks.GetAllBanks());
        Assert.Null(banks.UpdateBank(999, In("Z")));
    }

    [Fact]
    public void A_file_keeps_its_deactivated_bank_but_cannot_move_to_one()
    {
        var (_, work, db) = Setup();
        var bt = SeedBank(db, "BT");
        var other = SeedBank(db, "BCR");
        var file = work.AddBankFile(BothUser, new CrmBankFileInput { BankId = bt, CreditType = "NP", Amount = 10, Status = BankFileStatuses.Trimis });
        db.Banks.Single(b => b.Id == bt).Active = false;
        db.Banks.Single(b => b.Id == other).Active = false;
        db.SaveChanges();

        var kept = work.UpdateBankFile(file.Id, new CrmBankFileInput { BankId = bt, CreditType = "IP", Amount = 20, Status = BankFileStatuses.Analiza });
        Assert.Equal(bt, kept!.BankId);
        Assert.Equal("IP", kept.CreditType);
        Assert.Throws<InvalidOperationException>(() => work.UpdateBankFile(file.Id, new CrmBankFileInput { BankId = other, CreditType = "NP", Amount = 20, Status = BankFileStatuses.Analiza }));
        Assert.Throws<InvalidOperationException>(() => work.AddBankFile(BothUser, new CrmBankFileInput { BankId = bt, CreditType = "NP", Amount = 20, Status = BankFileStatuses.Trimis }));
    }

    [Fact]
    public void Deactivated_banks_with_files_stay_in_the_stats_muted_and_empty_ones_drop_out()
    {
        var (banks, _, db) = Setup();
        var used = SeedBank(db, "Veche");
        var unused = SeedBank(db, "Neutilizata");
        SeedBank(db, "Activa");
        File(db, BrokerId, used, "NP", 500m, BankFileStatuses.Disbursat, DateTime.UtcNow);
        db.Banks.Single(b => b.Id == used).Active = false;
        db.Banks.Single(b => b.Id == unused).Active = false;
        db.SaveChanges();

        var stats = banks.GetStats(BrokerUserId, null, false);

        Assert.DoesNotContain(stats.Banks, b => b.BankId == unused);
        var old = stats.Banks.Single(b => b.BankId == used);
        Assert.False(old.Active);
        Assert.Equal(500m, old.Network.DisbursedAmount);
        Assert.Equal(500m, old.Mine.DisbursedAmount);
        Assert.True(stats.Banks.Single(b => b.Name == "Activa").Active);
    }

    [Fact]
    public void Files_without_a_bank_are_counted_in_the_callers_scope_and_the_network_for_admin()
    {
        var (banks, _, db) = Setup();
        var now = DateTime.UtcNow;
        db.BankFiles.AddRange(
            new BankFile { BrokerProfileId = BrokerId, UserId = 1, BankName = "x", Amount = 100, Status = BankFileStatuses.Trimis, StatusChangedAt = now, CreatedAt = now, UpdatedAt = now },
            new BankFile { BrokerProfileId = OtherBrokerId, UserId = 2, BankName = "x", Amount = 250, Status = BankFileStatuses.Disbursat, StatusChangedAt = now, CreatedAt = now, UpdatedAt = now },
            new BankFile { BrokerProfileId = BrokerId, UserId = 3, BankName = "x", Amount = 999, Status = BankFileStatuses.Respins, StatusChangedAt = now, CreatedAt = now, UpdatedAt = now });
        db.SaveChanges();

        var mine = banks.GetStats(BrokerUserId, null, false).Unattributed;
        Assert.Equal(1, mine.Count);
        Assert.Equal(100m, mine.Amount);
        var network = banks.GetStats(AdminUserId, null, true).Unattributed;
        Assert.Equal(2, network.Count);
        Assert.Equal(350m, network.Amount);
    }

    [Fact]
    public void Per_broker_rows_include_files_without_a_broker_and_the_month_year_is_bounded()
    {
        var (banks, _, db) = Setup();
        var bt = SeedBank(db, "BT");
        var now = DateTime.UtcNow;
        File(db, BrokerId, bt, "NP", 100m, BankFileStatuses.Disbursat, now);
        db.BankFiles.Add(new BankFile { BrokerProfileId = null, UserId = 9, BankId = bt, BankName = "BT", CreditType = "IP", Amount = 40, Status = BankFileStatuses.Disbursat, StatusChangedAt = now, CreatedAt = now, UpdatedAt = now });
        db.SaveChanges();

        var stats = banks.GetStats(AdminUserId, null, true);
        Assert.Equal(stats.Banks.Single().Network.DisbursedAmount, stats.ByBroker!.Sum(b => b.DisbursedAmount));
        Assert.Contains(stats.ByBroker!, b => b.BrokerName == "Fără broker" && b.DisbursedAmount == 40m);
        Assert.Throws<InvalidOperationException>(() => banks.GetStats(AdminUserId, "1999-12", true));
        Assert.Throws<InvalidOperationException>(() => banks.GetStats(AdminUserId, "2101-01", true));
    }

    [Fact]
    public void Affiliates_see_only_their_own_files_and_the_network_counts_moneyshop_brokers_only()
    {
        var (banks, _, db) = Setup();
        var bt = SeedBank(db, "BT");
        var now = DateTime.UtcNow;
        File(db, BrokerId, bt, "NP", 100m, BankFileStatuses.Disbursat, now);
        File(db, OtherBrokerId, bt, "NP", 400m, BankFileStatuses.Disbursat, now);

        db.BrokerProfiles.Single(p => p.Id == OtherBrokerId).Type = BrokerTypes.Afiliat;
        db.SaveChanges();
        var moneyShop = banks.GetStats(BrokerUserId, null, false);
        Assert.True(moneyShop.ShowNetwork);
        Assert.Equal(100m, Assert.Single(moneyShop.Banks).Network.DisbursedAmount);

        db.BrokerProfiles.Single(p => p.Id == BrokerId).Type = BrokerTypes.Afiliat;
        db.SaveChanges();
        var affiliate = banks.GetStats(BrokerUserId, null, false);
        Assert.False(affiliate.ShowNetwork);
        var row = Assert.Single(affiliate.Banks);
        Assert.Equal(0m, row.Network.DisbursedAmount);
        Assert.Equal(100m, row.Mine.DisbursedAmount);
    }
}
