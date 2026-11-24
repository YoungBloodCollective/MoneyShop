using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Tests.Crm;

public class CommissionTiersTests
{
    private const int Ms1 = 11;
    private const int Ms2 = 12;
    private const int Aff = 13;
    private const int AdminUserId = 1;
    private const int Ms1User = 21;
    private const int AffUser = 23;
    private const string Month = "2026-11";

    private static readonly DateTime Nov15 = new(2026, 11, 15, 10, 0, 0, DateTimeKind.Utc);

    private static CommissionTierRow Row(decimal from, decimal? to, decimal percent) => new() { From = from, To = to, Percent = percent };

    private static (MoneyShopDbContext Db, int BankId) Setup()
    {
        var options = new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var db = new MoneyShopDbContext(options);
        db.BrokerProfiles.AddRange(
            Profile(Ms1, Ms1User, "Alex", BrokerTypes.MoneyShop, "Alex SRL"),
            Profile(Ms2, 22, "Maria", BrokerTypes.MoneyShop, null),
            Profile(Aff, AffUser, "Afiliat", BrokerTypes.Afiliat, null));
        var bank = new MoneyShop.DomainModel.Entities.Bank { Name = "ProCredit Bank", Active = true, CommissionPercent = 1m };
        db.Banks.Add(bank);
        db.SaveChanges();
        db.BankCommissionTiers.AddRange(
            Tier(bank.Id, "NP", 0, 500_000, 1.4m),
            Tier(bank.Id, "NP", 500_000, 1_000_000, 1.85m),
            Tier(bank.Id, "NP", 1_000_000, null, 2m));
        db.SaveChanges();
        return (db, bank.Id);
    }

    private static BankCommissionTier Tier(int bankId, string type, decimal from, decimal? to, decimal percent) =>
        new() { BankId = bankId, CreditType = type, FromAmount = from, ToAmount = to, Percent = percent };

    private static BrokerProfile Profile(int id, int userId, string name, string type, string? firm) => new()
    {
        Id = id,
        UserId = userId,
        Slug = name.ToLowerInvariant(),
        DisplayName = name,
        Type = type,
        FirmaNume = firm,
        Status = "Active",
        User = new Utilizatori { IdUtilizator = userId, Nume = name, Prenume = name, IdRol = 3 },
    };

    private static void File(MoneyShopDbContext db, int broker, int bankId, string? type, decimal amount, DateTime changedAt,
        string status = BankFileStatuses.Disbursat, int clientUserId = 500)
    {
        db.BankFiles.Add(new BankFile
        {
            BrokerProfileId = broker,
            UserId = clientUserId,
            BankId = bankId,
            BankName = "ProCredit Bank",
            CreditType = type,
            Amount = amount,
            Status = status,
            StatusChangedAt = changedAt,
            CreatedAt = changedAt,
            UpdatedAt = changedAt,
        });
        db.SaveChanges();
    }

    [Theory]
    [InlineData(0, 1.4)]
    [InlineData(499_999.99, 1.4)]
    [InlineData(500_000, 1.85)]
    [InlineData(999_999.99, 1.85)]
    [InlineData(1_000_000, 2)]
    [InlineData(25_000_000, 2)]
    public void Tier_resolution_respects_boundaries_and_the_open_ended_last_tier(double volume, double expected)
    {
        var tiers = new[] { Row(0, 500_000, 1.4m), Row(500_000, 1_000_000, 1.85m), Row(1_000_000, null, 2m) };
        Assert.Equal((decimal)expected, CommissionTiers.Resolve(tiers, (decimal)volume)!.Percent);
    }

    [Fact]
    public void Resolve_returns_null_in_a_gap_below_the_first_tier_and_without_tiers()
    {
        Assert.Null(CommissionTiers.Resolve(Array.Empty<CommissionTierRow>(), 100m));
        var tiers = new[] { Row(100_000, 200_000, 1m) };
        Assert.Null(CommissionTiers.Resolve(tiers, 50_000m));
        Assert.Equal(100_000m, CommissionTiers.Next(tiers, 50_000m)!.From);
    }

    [Fact]
    public void Status_reports_the_current_tier_and_the_volume_to_the_next_one()
    {
        var tiers = new[] { Row(0, 500_000, 1.4m), Row(500_000, null, 1.85m) };
        var below = CommissionTiers.Status("NP", tiers, 350_000m);
        Assert.Equal(1.4m, below.CurrentPercent);
        Assert.Equal(1.85m, below.NextPercent);
        Assert.Equal(150_000m, below.RemainingToNext);
        var top = CommissionTiers.Status("NP", tiers, 700_000m);
        Assert.Equal(1.85m, top.CurrentPercent);
        Assert.Null(top.NextPercent);
        Assert.Null(top.RemainingToNext);
    }

    [Fact]
    public void Network_basis_counts_only_moneyshop_brokers_of_the_month_credit_type_and_disbursed_files()
    {
        var (db, bank) = Setup();
        File(db, Ms1, bank, "NP", 300_000m, Nov15);
        File(db, Ms2, bank, "NP", 250_000m, Nov15);
        File(db, Aff, bank, "NP", 900_000m, Nov15);
        File(db, Ms1, bank, "NP", 2_000_000m, new DateTime(2026, 10, 15, 10, 0, 0, DateTimeKind.Utc));
        File(db, Ms1, bank, "IP", 700_000m, Nov15);
        File(db, Ms1, bank, "NP", 800_000m, Nov15, BankFileStatuses.Analiza);
        db.BrokerScopeId = Ms1;
        var month = new CommissionCalculator(db).ForMonth(Month);
        Assert.Equal(550_000m, month.NetworkVolume(bank, "NP"));
        Assert.Equal(1.85m, month.RateFor(Ms1, bank, "NP").Percent);
        Assert.True(month.RateFor(Ms2, bank, "NP").FromTier);
        Assert.Equal(5_550m, month.Commission(Ms1, bank, "NP", 300_000m));
    }

    [Fact]
    public void Affiliates_files_without_type_and_banks_without_tiers_fall_back_to_override_then_default()
    {
        var (db, bank) = Setup();
        File(db, Ms1, bank, "NP", 300_000m, Nov15);
        db.BrokerBankCommissions.Add(new BrokerBankCommission { BrokerProfileId = Ms1, BankId = bank, CommissionPercent = 1.2m, UpdatedAt = DateTime.UtcNow });
        db.SaveChanges();
        var month = new CommissionCalculator(db).ForMonth(Month);
        Assert.Equal(1m, month.RateFor(Aff, bank, "NP").Percent);
        Assert.False(month.RateFor(Aff, bank, "NP").FromTier);
        Assert.Equal(1.2m, month.RateFor(Ms1, bank, null).Percent);
        Assert.Equal(1.2m, month.RateFor(Ms1, bank, "IP").Percent);
        Assert.Equal(1m, month.RateFor(Ms2, bank, "IP").Percent);
        Assert.Equal(1m, month.RateFor(null, bank, "NP").Percent);
    }

    [Fact]
    public void Stats_use_the_tier_for_the_estimate_and_show_progress_only_to_moneyshop_and_admin()
    {
        var (db, bank) = Setup();
        File(db, Ms1, bank, "NP", 300_000m, Nov15);
        File(db, Ms2, bank, "NP", 250_000m, Nov15);
        File(db, Aff, bank, "NP", 100_000m, Nov15);
        var banks = new BankCatalogService(db);

        db.BrokerScopeId = Ms1;
        var mine = banks.GetStats(Ms1User, Month, false).Banks.Single();
        Assert.Equal(5_550m, mine.Mine.EstimatedCommission);
        Assert.Equal(1.85m, mine.Mine.NpPercent);
        Assert.Equal(1m, mine.Mine.IpPercent);
        var np = Assert.Single(mine.Tiers);
        Assert.Equal(550_000m, np.NetworkAmount);
        Assert.Equal(450_000m, np.RemainingToNext);
        Assert.Equal(2m, np.NextPercent);

        db.BrokerScopeId = Aff;
        var aff = banks.GetStats(AffUser, Month, false);
        Assert.Empty(aff.Banks.Single().Tiers);
        Assert.Equal(1_000m, aff.Banks.Single().Mine.EstimatedCommission);
    }

    [Fact]
    public void Admin_network_estimate_uses_the_tiers_for_moneyshop_files_only()
    {
        var (db, bank) = Setup();
        File(db, Ms1, bank, "NP", 300_000m, Nov15);
        File(db, Ms2, bank, "NP", 250_000m, Nov15);
        File(db, Aff, bank, "NP", 100_000m, Nov15);
        var result = new CrmNetworkService(db).GetAdminDashboard(36, 2026, 11);
        Assert.Equal(550_000m * 1.85m / 100m, result.MoneyShop.EstimatedCommission);
    }

    [Fact]
    public void Validation_accepts_sorted_rows_and_rejects_overlaps_bad_ranges_and_percents()
    {
        var sorted = CommissionTiers.Validate(new[] { Row(500_000, null, 1.85m), Row(0, 500_000, 1.4m) });
        Assert.Equal(new decimal[] { 0, 500_000 }, sorted.Select(t => t.From).ToArray());
        Assert.Empty(CommissionTiers.Validate(Array.Empty<CommissionTierRow>()));
        Assert.Throws<InvalidOperationException>(() => CommissionTiers.Validate(new[] { Row(0, 500_000, 1m), Row(400_000, 900_000, 2m) }));
        Assert.Throws<InvalidOperationException>(() => CommissionTiers.Validate(new[] { Row(100, 100, 1m) }));
        Assert.Throws<InvalidOperationException>(() => CommissionTiers.Validate(new[] { Row(200, 100, 1m) }));
        Assert.Throws<InvalidOperationException>(() => CommissionTiers.Validate(new[] { Row(0, 100, 100.5m) }));
        Assert.Throws<InvalidOperationException>(() => CommissionTiers.Validate(new[] { Row(0, 100, -1m) }));
        Assert.Throws<InvalidOperationException>(() => CommissionTiers.Validate(new[] { Row(-5, 100, 1m) }));
        Assert.Throws<InvalidOperationException>(() => CommissionTiers.Validate(new[] { Row(0, null, 1m), Row(100, 200, 2m) }));
        Assert.Throws<InvalidOperationException>(() => CommissionTiers.Validate(null));
    }

    [Fact]
    public void Save_replaces_the_tiers_of_one_credit_type_and_validates_before_writing()
    {
        var (db, bank) = Setup();
        var banks = new BankCatalogService(db);
        var saved = banks.SaveTiers(bank, "IP", new() { Row(0, 1_000_000, 0.9m), Row(1_000_000, null, 1.1m) })!;
        Assert.Equal(2, saved.Count);
        var tiers = banks.GetTiers(bank)!;
        Assert.Equal(3, tiers.Np.Count);
        Assert.Equal(2, tiers.Ip.Count);
        Assert.Throws<InvalidOperationException>(() => banks.SaveTiers(bank, "NP", new() { Row(0, 10, 1m), Row(5, 20, 1m) }));
        Assert.Equal(3, banks.GetTiers(bank)!.Np.Count);
        Assert.Throws<InvalidOperationException>(() => banks.SaveTiers(bank, "XX", new()));
        banks.SaveTiers(bank, "NP", new());
        Assert.Empty(banks.GetTiers(bank)!.Np);
        Assert.Null(banks.SaveTiers(9999, "NP", new()));
        Assert.Null(banks.GetTiers(9999));
    }

    private static CommissionReportService Reports(MoneyShopDbContext db) => new(db, new CommissionCalculator(db));

    [Fact]
    public void Report_lists_the_brokers_disbursed_files_with_percent_commission_subtotals_and_totals()
    {
        var (db, bank) = Setup();
        db.Utilizatoris.Add(new Utilizatori { IdUtilizator = 500, Nume = "Popescu", Prenume = "Ion", IdRol = 1 });
        db.SaveChanges();
        File(db, Ms1, bank, "NP", 300_000m, new DateTime(2026, 11, 10, 22, 30, 0, DateTimeKind.Utc));
        File(db, Ms1, bank, "IP", 200_000m, Nov15);
        File(db, Ms2, bank, "NP", 250_000m, Nov15);
        File(db, Ms1, bank, "NP", 50_000m, new DateTime(2026, 11, 30, 22, 30, 0, DateTimeKind.Utc));
        File(db, Ms1, bank, "NP", 70_000m, Nov15, BankFileStatuses.Respins);
        db.BrokerScopeId = Ms1;

        var report = Reports(db).Build(Ms1User, false, Month, null);
        Assert.Equal("Alex", report.BrokerName);
        Assert.Equal("Alex SRL", report.FirmName);
        var group = Assert.Single(report.Banks);
        Assert.Equal(2, group.Count);
        Assert.Equal(new DateTime(2026, 11, 11), group.Rows[0].Date);
        Assert.Equal("Ion Popescu", group.Rows[0].ClientName);
        Assert.Equal(1.85m, group.Rows[0].Percent);
        Assert.Equal(5_550m, group.Rows[0].Commission);
        Assert.Equal("IP", group.Rows[1].CreditType);
        Assert.Equal(1m, group.Rows[1].Percent);
        Assert.Equal(2_000m, group.Rows[1].Commission);
        Assert.Equal(500_000m, report.TotalAmount);
        Assert.Equal(7_550m, report.TotalCommission);
        Assert.Equal(2, report.Count);
    }

    [Fact]
    public void A_broker_cannot_get_another_brokers_report_but_the_admin_can_pick_one()
    {
        var (db, bank) = Setup();
        File(db, Ms1, bank, "NP", 300_000m, Nov15);
        File(db, Ms2, bank, "NP", 250_000m, Nov15);
        db.BrokerScopeId = Ms1;
        var reports = Reports(db);
        Assert.Throws<UnauthorizedAccessException>(() => reports.Build(Ms1User, false, Month, Ms2));
        Assert.Throws<UnauthorizedAccessException>(() => reports.Generate(Ms1User, false, Month, Ms2, "pdf"));
        Assert.Equal(300_000m, reports.Build(Ms1User, false, Month, Ms1).TotalAmount);
        Assert.Equal(300_000m, reports.Build(Ms1User, false, Month, null).TotalAmount);

        db.BrokerScopeId = null;
        Assert.Equal(250_000m, reports.Build(AdminUserId, true, Month, Ms2).TotalAmount);
        Assert.Throws<InvalidOperationException>(() => reports.Build(AdminUserId, true, Month, null));
        Assert.Throws<InvalidOperationException>(() => reports.Build(AdminUserId, true, Month, 9999));
        Assert.Throws<InvalidOperationException>(() => reports.Build(AdminUserId, true, "noiembrie", Ms1));
    }

    [Fact]
    public void Pdf_and_xlsx_are_generated_with_the_expected_file_names_and_content()
    {
        var (db, bank) = Setup();
        File(db, Ms1, bank, "NP", 300_000m, Nov15);
        db.BrokerScopeId = Ms1;
        var reports = Reports(db);

        var pdf = reports.Generate(Ms1User, false, Month, null, "pdf");
        Assert.Equal("raport-comisioane-2026-11-alex.pdf", pdf.FileName);
        Assert.Equal("application/pdf", pdf.ContentType);
        Assert.True(pdf.Content.Length > 500);
        Assert.Equal("%PDF", Encoding.ASCII.GetString(pdf.Content, 0, 4));

        var xlsx = reports.Generate(Ms1User, false, Month, null, "xlsx");
        Assert.Equal("raport-comisioane-2026-11-alex.xlsx", xlsx.FileName);
        Assert.True(xlsx.Content.Length > 500);
        using var zip = new ZipArchive(new MemoryStream(xlsx.Content));
        Assert.NotNull(zip.GetEntry("xl/styles.xml"));
        using var sheet = new StreamReader(zip.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var xml = sheet.ReadToEnd();
        Assert.Contains("<v>300000</v>", xml);
        Assert.Contains("<v>0.014</v>", xml);
        Assert.Contains("<v>4200", xml);
        Assert.Contains("Alex SRL", xml);
        System.Xml.Linq.XDocument.Parse(xml);

        Assert.Throws<InvalidOperationException>(() => reports.Generate(Ms1User, false, Month, null, "doc"));
    }
}
