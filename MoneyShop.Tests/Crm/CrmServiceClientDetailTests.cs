using System;
using System.Linq;
using System.Text.Json;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Dtos.BcReport;
using MoneyShop.ServiceInterface.Interfaces.Subject;

namespace MoneyShop.Tests.Crm;

public class CrmServiceClientDetailTests
{
    private const int RichUser = 201;
    private const string PdfText = "%PDF-1.4 test";

    private static (CrmService Service, MoneyShopDbContext Db, FakeSubjectService Subjects) BuildRich()
    {
        var (service, db) = CrmServiceClientUnionTests.Build(out var subjects);
        var kycId = Guid.NewGuid();
        var acordId = Guid.NewGuid();
        db.Utilizatoris.Add(new Utilizatori { IdUtilizator = RichUser, Nume = "Rich", Prenume = "Client", IdRol = 1 });
        db.AcordClients.Add(new AcordClient
        {
            AcordId = acordId,
            BrokerProfileId = CrmServiceClientUnionTests.BrokerId,
            UserId = RichUser,
            KycId = kycId,
            Token = Guid.NewGuid().ToString("N"),
            Nume = "Rich",
            Prenume = "Client",
            Telefon = "0700000001",
            Status = "signed",
            CreatedAt = new DateTime(2026, 11, 2),
            UpdatedAt = new DateTime(2026, 11, 2),
            SignedAt = new DateTime(2026, 11, 2),
        });
        db.KycFiles.AddRange(
            new KycFile { KycId = kycId, FileType = "id_front", FileName = "f.png", MimeType = "image/png", FileSize = 10, ExpiresAt = DateTime.UtcNow.AddDays(10) },
            new KycFile { KycId = kycId, FileType = "bank_patria_consimtamant", FileName = "p.pdf", MimeType = "application/pdf", FileSize = 20, ExpiresAt = DateTime.UtcNow.AddDays(10) },
            new KycFile { KycId = kycId, FileType = "selfie", FileName = "gone.png", MimeType = "image/png", FileSize = 5, ExpiresAt = DateTime.UtcNow, DeletedAt = DateTime.UtcNow });
        db.BankConsentRequests.Add(new BankConsentRequest
        {
            AcordId = acordId,
            BrokerProfileId = CrmServiceClientUnionTests.BrokerId,
            BankCode = "patria",
            TokenHash = "x",
            FullName = "Rich Client",
            Telefon = "0700000001",
            Status = "signed",
            ExpiresAt = DateTime.UtcNow.AddDays(3),
            SignedAt = DateTime.UtcNow,
        });
        db.Applications.Add(new MoneyShop.DomainModel.Entities.Application
        {
            BrokerProfileId = CrmServiceClientUnionTests.BrokerId,
            UserId = RichUser,
            Status = "IN_ANALIZA",
            CreatedAt = new DateTime(2026, 11, 3),
            UpdatedAt = new DateTime(2026, 11, 3),
        });
        var parsed = new BcParsedData
        {
            FicoScore = 712,
            ReportDate = "2026-11-01",
            SubjectCnp = FakeBcReportService.LeakyCnp,
            BankingIndicators = new BcIndicators { TotalAmountOwed = 1000, TotalArrears = 50, MaxCurrentDelay = "12 zile" },
            Accounts =
            {
                new BcAccountSummary { Creditor = "Banca X", AccountType = "Credit de consum", CurrentBalance = 900, IsActive = true, HasArrears = true, ArrearsAmount = 50, DaysOverdue = 12 },
                new BcAccountSummary { Creditor = "Banca Y", AccountType = "Card", CurrentBalance = 0, IsActive = false },
            },
            Inquiries = { new BcInquiry { Institution = "Banca Z" } },
        };
        db.BcReports.Add(new MoneyShop.DomainModel.Entities.BcReport
        {
            UserId = RichUser,
            ReportId = "r1",
            FileName = "raport.pdf",
            FicoScore = 712,
            ExistingMonthlyObligations = 450,
            Dpd30Count = 1,
            FileContentBase64 = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes(PdfText)),
            ParsedDataJson = JsonSerializer.Serialize(parsed),
            CreatedAt = new DateTime(2026, 11, 4),
        });
        db.SaveChanges();
        return (service, db, subjects);
    }

    [Fact]
    public void GetClient_returns_acord_snapshot_with_files_and_bank_consents()
    {
        var (service, _, _) = BuildRich();

        var client = service.GetClient(RichUser);

        Assert.NotNull(client);
        Assert.NotNull(client!.Acord);
        Assert.Equal("signed", client.Acord!.Status);
        Assert.Equal(2, client.Acord.Files.Count);
        Assert.DoesNotContain(client.Acord.Files, f => f.IsDeleted);
        Assert.Single(client.Acord.BankConsents);
        Assert.Equal("patria", client.Acord.BankConsents[0].BankCode);
    }

    private static int ReportId(MoneyShopDbContext db, int userId) => db.BcReports.Single(r => r.UserId == userId).Id;

    [Fact]
    public void GetClient_acord_snapshot_does_not_carry_full_cnp()
    {
        var (service, _, _) = BuildRich();

        var client = service.GetClient(RichUser)!;

        Assert.Equal("Rich", client.Acord!.Nume);
        Assert.Equal("Client", client.Acord.Prenume);
        Assert.Equal("0700000001", client.Acord.Telefon);
        Assert.DoesNotContain(FakeAcordService.FullCnp, JsonSerializer.Serialize(client));
    }

    [Fact]
    public void GetClient_acord_without_kyc_has_no_files_and_does_not_throw()
    {
        var (service, db, _) = BuildRich();
        db.Utilizatoris.Add(new Utilizatori { IdUtilizator = 401, Nume = "No", Prenume = "Kyc", IdRol = 1 });
        db.AcordClients.Add(new AcordClient
        {
            BrokerProfileId = CrmServiceClientUnionTests.BrokerId,
            UserId = 401,
            Token = Guid.NewGuid().ToString("N"),
            Nume = "No",
            Prenume = "Kyc",
            Telefon = "0700000002",
            Status = "started",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        db.SaveChanges();

        var client = service.GetClient(401)!;

        Assert.NotNull(client.Acord);
        Assert.Empty(client.Acord!.Files);
        Assert.Empty(client.Acord.BankConsents);
    }

    [Fact]
    public void GetClient_returns_bc_snapshot_with_fico_and_no_cnp_anywhere()
    {
        var (service, _, _) = BuildRich();

        var client = service.GetClient(RichUser)!;

        Assert.NotNull(client.BcReport);
        Assert.Equal(712, client.BcReport!.FicoScore);
        Assert.True(client.BcReport.HasPdf);
        Assert.Equal(2, client.BcReport.TotalAccounts);
        Assert.Equal(1, client.BcReport.ActiveAccounts);
        Assert.Equal(1, client.BcReport.AccountsWithArrears);
        Assert.Equal(1000m, client.BcReport.TotalAmountOwed);
        Assert.Equal("12 zile", client.BcReport.MaxCurrentDelay);
        Assert.Equal(1, client.BcReport.InquiriesCount);
        Assert.Equal(2, client.BcReport.Accounts.Count);
        var json = JsonSerializer.Serialize(client);
        Assert.DoesNotContain(FakeBcReportService.LeakyCnp, json);
    }

    [Fact]
    public void GetClient_without_acord_or_bc_has_null_snapshots()
    {
        var (service, _) = CrmServiceClientUnionTests.Build();

        var client = service.GetClient(CrmServiceClientUnionTests.FileOnlyUser)!;

        Assert.Null(client.Acord);
        Assert.Null(client.BcReport);
    }

    [Fact]
    public void GetClient_out_of_scope_returns_null()
    {
        var (service, _) = CrmServiceClientUnionTests.Build();

        Assert.Null(service.GetClient(CrmServiceClientUnionTests.OtherBrokerUser));
    }

    [Fact]
    public void GetClientBcReportPdf_returns_pdf_and_logs_cnp_access()
    {
        var (service, db, subjects) = BuildRich();

        var pdf = service.GetClientBcReportPdf(RichUser, ReportId(db, RichUser), new CnpAccessContext { Reason = "bc_report_download", ActorUserId = 7 });

        Assert.NotNull(pdf);
        Assert.Equal(PdfText, System.Text.Encoding.ASCII.GetString(pdf!.Content));
        var logged = Assert.Single(subjects.Logged);
        Assert.Equal(RichUser, logged.UserId);
        Assert.Equal("bc_report_download", logged.Access.Reason);
        Assert.NotNull(logged.Access.AcordId);
    }

    [Fact]
    public void GetClientBcReportPdf_out_of_scope_returns_null_and_logs_nothing()
    {
        var (service, db, subjects) = BuildRich();
        db.Utilizatoris.Add(new Utilizatori { IdUtilizator = 301, Nume = "O", Prenume = "O", IdRol = 1 });
        db.BcReports.Add(new MoneyShop.DomainModel.Entities.BcReport { UserId = 301, ReportId = "r2", FileContentBase64 = "AAAA", CreatedAt = DateTime.UtcNow });
        db.SaveChanges();

        Assert.Null(service.GetClientBcReportPdf(301, ReportId(db, 301), new CnpAccessContext { Reason = "bc_report_download" }));
        Assert.Null(service.GetClientBcReportPdf(CrmServiceClientUnionTests.OtherBrokerUser, 1, new CnpAccessContext { Reason = "bc_report_download" }));
        Assert.Empty(subjects.Logged);
    }

    [Fact]
    public void GetClientBcReportPdf_without_report_returns_null()
    {
        var (service, _) = CrmServiceClientUnionTests.Build();

        Assert.Null(service.GetClientBcReportPdf(CrmServiceClientUnionTests.BothUser, 1, new CnpAccessContext { Reason = "bc_report_download" }));
    }

    [Fact]
    public void GetClientBcReportPdf_returns_null_when_cnp_log_cannot_be_written()
    {
        var (service, db, subjects) = BuildRich();
        subjects.Result = false;

        Assert.Null(service.GetClientBcReportPdf(RichUser, ReportId(db, RichUser), new CnpAccessContext { Reason = "bc_report_download" }));
    }

    [Fact]
    public void GetClientBcReportPdf_with_another_users_report_id_returns_null()
    {
        var (service, db, _) = BuildRich();
        db.BcReports.Add(new MoneyShop.DomainModel.Entities.BcReport { UserId = 999, ReportId = "r9", FileContentBase64 = "AAAA", CreatedAt = DateTime.UtcNow });
        db.SaveChanges();

        Assert.Null(service.GetClientBcReportPdf(RichUser, ReportId(db, 999), new CnpAccessContext { Reason = "bc_report_download" }));
    }
}
