using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Assignment;
using MoneyShop.ServiceInterface.Interfaces.Assignment;

namespace MoneyShop.Tests.Assignment;

public class AssignmentServiceTests
{
    private const int Alex = 1;
    private const int Maria = 2;
    private const int Suspended = 3;
    private static readonly AssignActor SuperAdmin = new(99, "Administrator", "127.0.0.1");

    private static (AssignmentService Service, MoneyShopDbContext Db, Guid AcordId) Build()
    {
        var options = new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new MoneyShopDbContext(options);

        db.BrokerProfiles.AddRange(
            new BrokerProfile { Id = Alex, UserId = 10, Slug = "alex", DisplayName = "Alex", Status = "Active" },
            new BrokerProfile { Id = Maria, UserId = 11, Slug = "maria", DisplayName = "Maria", Status = "Active" },
            new BrokerProfile { Id = Suspended, UserId = 12, Slug = "susp", DisplayName = "Suspendat", Status = "Suspended" });

        db.Appointments.AddRange(
            Appointment(100, null, new DateTime(2026, 11, 20, 9, 0, 0)),
            Appointment(101, Alex, new DateTime(2026, 11, 20, 10, 0, 0)));

        db.LeadCaptures.Add(new LeadCapture
        {
            Id = 200, BrokerProfileId = null, NumePrenume = "Lead Nou", Telefon = "0722000200",
            Email = "lead@example.com", Oras = "Cluj", Source = "api",
            CreatedAt = new DateTime(2026, 11, 20, 11, 0, 0), UpdatedAt = new DateTime(2026, 11, 20, 11, 0, 0),
        });

        var acordId = Guid.NewGuid();
        db.AcordClients.Add(new AcordClient
        {
            AcordId = acordId, BrokerProfileId = Alex, UserId = 500, Token = "t", Nume = "Popescu", Prenume = "Ion",
            Telefon = "0722000300", Status = "signed", CreatedAt = new DateTime(2026, 11, 19),
        });
        db.BankConsentRequests.Add(new BankConsentRequest
        {
            AcordId = acordId, BrokerProfileId = Alex, BankCode = "PATRIA", TokenHash = "h", FullName = "Ion Popescu", Telefon = "0722000300",
        });

        db.SaveChanges();
        db.ChangeTracker.Clear();
        return (new AssignmentService(db), db, acordId);
    }

    private static Appointment Appointment(int id, int? broker, DateTime createdAt) => new()
    {
        Id = id, BrokerProfileId = broker, Nume = "Client", Prenume = id.ToString(), Judet = "B", TipCredit = "NP",
        SalariuNet = 5000, Telefon = $"0722{id:000000}", Email = "", CreatedAt = createdAt, UpdatedAt = createdAt,
    };

    [Fact]
    public async Task Inbox_lists_only_requests_without_a_broker_newest_first()
    {
        var (service, _, _) = Build();

        var inbox = await service.GetInboxAsync();

        Assert.Equal(new[] { "lead:200", "appointment:100" }, inbox.Select(i => $"{i.EntityType}:{i.Id}"));
    }

    [Fact]
    public async Task Assigning_an_unassigned_appointment_sets_the_owner_and_writes_an_audit_event()
    {
        var (service, db, _) = Build();

        var outcome = await service.AssignAsync(
            new AssignInput { EntityType = "appointment", Id = "100", BrokerProfileId = Alex }, SuperAdmin);

        Assert.True(outcome.Ok);
        Assert.Equal("assign", outcome.Action);
        Assert.Equal("/crm/programari", outcome.CrmPath);
        Assert.Equal(Alex, db.Appointments.Single(a => a.Id == 100).BrokerProfileId);
        var audit = db.AuditEvents.Single(e => e.EntityType == "appointment");
        Assert.Equal("100", audit.EntityId);
        Assert.Equal(99, audit.ActorUserId);
        Assert.Contains("null", audit.OldValueJson);
        Assert.Contains(Alex.ToString(), audit.NewValueJson);
    }

    [Fact]
    public async Task Transferring_an_acord_moves_its_bank_consents_and_keeps_the_reason()
    {
        var (service, db, acordId) = Build();

        var outcome = await service.AssignAsync(
            new AssignInput { EntityType = "acord", Id = acordId.ToString(), BrokerProfileId = Maria, Reason = "Concediu" }, SuperAdmin);

        Assert.Equal("transfer", outcome.Action);
        Assert.Equal(Maria, db.AcordClients.Single().BrokerProfileId);
        Assert.Equal(Maria, db.BankConsentRequests.Single().BrokerProfileId);
        var history = await service.GetHistoryAsync("acord", acordId.ToString());
        Assert.Equal("Concediu", Assert.Single(history).Reason);
    }

    [Fact]
    public async Task Returning_to_the_inbox_is_an_unassign()
    {
        var (service, db, _) = Build();

        var outcome = await service.AssignAsync(
            new AssignInput { EntityType = "appointment", Id = "101", BrokerProfileId = null }, SuperAdmin);

        Assert.Equal("unassign", outcome.Action);
        Assert.Null(db.Appointments.Single(a => a.Id == 101).BrokerProfileId);
    }

    [Fact]
    public async Task Same_owner_changes_nothing_and_writes_no_audit()
    {
        var (service, db, _) = Build();

        var outcome = await service.AssignAsync(
            new AssignInput { EntityType = "appointment", Id = "101", BrokerProfileId = Alex }, SuperAdmin);

        Assert.Equal("unchanged", outcome.Action);
        Assert.Empty(db.AuditEvents.Where(e => e.EntityType == "appointment"));
    }

    [Theory]
    [InlineData("appointment", "100", Suspended, AssignError.BrokerInactive)]
    [InlineData("appointment", "100", 404, AssignError.BrokerNotFound)]
    [InlineData("appointment", "abc", Alex, AssignError.InvalidId)]
    [InlineData("appointment", "999", Alex, AssignError.NotFound)]
    [InlineData("dosar", "1", Alex, AssignError.InvalidType)]
    public async Task Invalid_requests_are_rejected_without_changes(string type, string id, int broker, AssignError expected)
    {
        var (service, db, _) = Build();

        var outcome = await service.AssignAsync(new AssignInput { EntityType = type, Id = id, BrokerProfileId = broker }, SuperAdmin);

        Assert.Equal(expected, outcome.Error);
        Assert.Null(db.Appointments.Single(a => a.Id == 100).BrokerProfileId);
        Assert.Empty(db.AuditEvents);
    }
}
