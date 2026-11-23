using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Lead;

namespace MoneyShop.Tests.Lead;

public class LeadServiceTests
{
    private sealed class FixedTime : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2030, 1, 7, 8, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static (LeadService Service, MoneyShopDbContext Db, FixedTime Time) Build(string? key = null, MoneyShopDbContext? db = null)
    {
        db ??= new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JwtSettings:SecretKey"] = key ?? new string('k', 40),
        }).Build();
        var time = new FixedTime();
        return (new LeadService(db, config, NullLogger<LeadService>.Instance, time), db, time);
    }

    private static LeadCapture AddLead(MoneyShopDbContext db, int? broker = 1, string name = "Popescu Ana Maria", string phone = "0722 000 111")
    {
        var lead = new LeadCapture
        {
            BrokerProfileId = broker, NumePrenume = name, Telefon = phone, Email = "ana@example.com", Oras = "Cluj",
            Source = "appointment", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        db.LeadCaptures.Add(lead);
        db.SaveChanges();
        return lead;
    }

    private static AcordClient AddAcord(MoneyShopDbContext db, int userId, int? broker = 1)
    {
        var acord = new AcordClient { UserId = userId, BrokerProfileId = broker, Token = "t", Nume = "Popescu", Prenume = "Ana", Telefon = "0722000111" };
        db.AcordClients.Add(acord);
        db.SaveChanges();
        return acord;
    }

    private static Appointment Booking(int? broker = 1, string phone = "0722000111") => new()
    {
        BrokerProfileId = broker, Nume = "Popescu", Prenume = "Ana", Judet = "Cluj", TipCredit = "Nevoi personale", SalariuNet = 5000,
        Telefon = phone, Email = "ana@example.com", Source = "site", IntarzieriBirou = "Da-60 zile", PopriRecuperare = "DA",
    };

    [Fact]
    public async Task Token_round_trips_and_prefill_splits_the_name()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db);

        var link = await svc.IssueAcordLinkAsync(lead.Id);
        var prefill = await svc.GetAcordPrefillAsync(link!.Token);

        Assert.NotNull(prefill);
        Assert.Equal("Popescu", prefill!.Nume);
        Assert.Equal("Ana Maria", prefill.Prenume);
        Assert.Equal("0722 000 111", prefill.Telefon);
        Assert.Equal("ana@example.com", prefill.Email);
    }

    [Fact]
    public async Task Token_is_valid_for_fourteen_days()
    {
        var (svc, db, time) = Build();
        var lead = AddLead(db);
        var link = await svc.IssueAcordLinkAsync(lead.Id);

        Assert.Equal(time.Now.UtcDateTime.AddDays(14), link!.ExpiresAt);
        time.Now = time.Now.AddDays(13);
        Assert.NotNull(await svc.GetAcordPrefillAsync(link.Token));
        time.Now = time.Now.AddDays(2);
        Assert.Null(await svc.GetAcordPrefillAsync(link.Token));
    }

    [Fact]
    public async Task Tampered_or_foreign_tokens_are_rejected()
    {
        var (svc, db, _) = Build();
        var first = AddLead(db);
        var second = AddLead(db, phone: "0733000222");
        var token = (await svc.IssueAcordLinkAsync(first.Id))!.Token;
        var otherToken = (await svc.IssueAcordLinkAsync(second.Id))!.Token;
        var parts = token.Split('.');

        Assert.Null(await svc.GetAcordPrefillAsync(null));
        Assert.Null(await svc.GetAcordPrefillAsync(""));
        Assert.Null(await svc.GetAcordPrefillAsync("garbage"));
        Assert.Null(await svc.GetAcordPrefillAsync("a.b.c"));
        Assert.Null(await svc.GetAcordPrefillAsync(parts[0] + "." + otherToken.Split('.')[1]));
        Assert.Null(await svc.GetAcordPrefillAsync(otherToken.Split('.')[0] + "." + parts[1]));
        Assert.Null(await svc.GetAcordPrefillAsync(parts[0] + "." + (parts[1][0] == 'A' ? 'B' : 'A') + parts[1][1..]));

        var (otherKeyService, _, _) = Build(new string('z', 40), db);
        Assert.Null(await otherKeyService.GetAcordPrefillAsync(token));
    }

    [Fact]
    public async Task Issuing_a_link_marks_a_new_lead_contacted_and_keeps_other_statuses()
    {
        var (svc, db, time) = Build();
        var fresh = AddLead(db);
        var done = AddLead(db, phone: "0733000222");
        done.Status = LeadStatuses.Converted;
        db.SaveChanges();

        await svc.IssueAcordLinkAsync(fresh.Id);
        await svc.IssueAcordLinkAsync(done.Id);

        Assert.Equal(LeadStatuses.Contacted, fresh.Status);
        Assert.Equal(time.Now.UtcDateTime, fresh.ContactedAt);
        Assert.Equal(LeadStatuses.Converted, done.Status);
        Assert.Null(await svc.IssueAcordLinkAsync(9999));
    }

    [Fact]
    public async Task Valid_token_links_the_client_and_converts_the_lead()
    {
        var (svc, db, time) = Build();
        var lead = AddLead(db);
        var acord = AddAcord(db, userId: 42);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;

        Assert.True(await svc.LinkAcordAsync(token, acord.AcordId));

        var saved = db.LeadCaptures.Single();
        Assert.Equal(42, saved.UserId);
        Assert.Equal(LeadStatuses.Converted, saved.Status);
        Assert.NotNull(saved.ContactedAt);
        Assert.Equal(time.Now.UtcDateTime, saved.UpdatedAt);
    }

    [Fact]
    public async Task Link_is_refused_when_the_acord_belongs_to_another_broker()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db, broker: 1);
        var acord = AddAcord(db, userId: 7, broker: 2);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;

        Assert.False(await svc.LinkAcordAsync(token, acord.AcordId));

        var saved = db.LeadCaptures.Single();
        Assert.Null(saved.UserId);
        Assert.Equal(LeadStatuses.Contacted, saved.Status);
        Assert.Equal(1, saved.BrokerProfileId);
        Assert.Equal(2, db.AcordClients.Single().BrokerProfileId);
    }

    [Fact]
    public async Task Lead_without_a_broker_links_to_any_broker_acord()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db, broker: null);
        var acord = AddAcord(db, userId: 7, broker: 2);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;

        Assert.True(await svc.LinkAcordAsync(token, acord.AcordId));

        Assert.Equal(7, db.LeadCaptures.Single().UserId);
        Assert.Null(db.LeadCaptures.Single().BrokerProfileId);
    }

    [Fact]
    public async Task Link_is_refused_when_the_phone_differs()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db, phone: "0733 000 222");
        var acord = AddAcord(db, userId: 7);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;

        Assert.False(await svc.LinkAcordAsync(token, acord.AcordId));

        var saved = db.LeadCaptures.Single();
        Assert.Null(saved.UserId);
        Assert.Equal(LeadStatuses.Contacted, saved.Status);
    }

    [Fact]
    public async Task Link_matches_the_phone_across_formats()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db, phone: "0040 722 000 111");
        var acord = AddAcord(db, userId: 7);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;

        Assert.True(await svc.LinkAcordAsync(token, acord.AcordId));
    }

    [Fact]
    public async Task Link_never_overwrites_a_different_client_and_does_not_convert()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db);
        lead.UserId = 99;
        db.SaveChanges();
        var acord = AddAcord(db, userId: 7);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;

        Assert.False(await svc.LinkAcordAsync(token, acord.AcordId));

        var saved = db.LeadCaptures.Single();
        Assert.Equal(99, saved.UserId);
        Assert.NotEqual(LeadStatuses.Converted, saved.Status);
    }

    [Fact]
    public async Task Issuing_a_link_returns_the_slug_of_the_leads_broker()
    {
        var (svc, db, _) = Build();
        db.BrokerProfiles.Add(new BrokerProfile { Id = 1, Slug = "alex", DisplayName = "Alex" });
        db.SaveChanges();
        var withBroker = AddLead(db, broker: 1);
        var withoutBroker = AddLead(db, broker: null, phone: "0733000222");

        Assert.Equal("alex", (await svc.IssueAcordLinkAsync(withBroker.Id))!.BrokerSlug);
        Assert.Null((await svc.IssueAcordLinkAsync(withoutBroker.Id))!.BrokerSlug);
    }

    [Fact]
    public async Task Prefill_only_gives_names_for_appointment_leads()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db);
        lead.Source = "api";
        db.SaveChanges();
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;

        var prefill = await svc.GetAcordPrefillAsync(token);

        Assert.Equal("", prefill!.Nume);
        Assert.Equal("", prefill.Prenume);
        Assert.Equal("ana@example.com", prefill.Email);
        Assert.Equal("0722 000 111", prefill.Telefon);
    }

    [Fact]
    public async Task Prefill_is_gone_once_the_lead_is_converted()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db);
        var acord = AddAcord(db, userId: 42);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;
        Assert.NotNull(await svc.GetAcordPrefillAsync(token));

        await svc.LinkAcordAsync(token, acord.AcordId);

        Assert.Null(await svc.GetAcordPrefillAsync(token));
    }

    [Fact]
    public async Task Invalid_token_changes_no_lead()
    {
        var (svc, db, time) = Build();
        var lead = AddLead(db);
        var acord = AddAcord(db, userId: 42);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;
        time.Now = time.Now.AddDays(30);

        Assert.False(await svc.LinkAcordAsync(token, acord.AcordId));
        Assert.False(await svc.LinkAcordAsync("garbage", acord.AcordId));
        Assert.False(await svc.LinkAcordAsync(null, acord.AcordId));

        var saved = db.LeadCaptures.Single();
        Assert.Null(saved.UserId);
        Assert.Equal(LeadStatuses.Contacted, saved.Status);
    }

    [Fact]
    public async Task A_lead_already_tied_to_a_client_keeps_that_client()
    {
        var (svc, db, _) = Build();
        var lead = AddLead(db);
        var first = AddAcord(db, userId: 42);
        var second = AddAcord(db, userId: 43);
        var token = (await svc.IssueAcordLinkAsync(lead.Id))!.Token;

        await svc.LinkAcordAsync(token, first.AcordId);
        await svc.LinkAcordAsync(token, second.AcordId);

        Assert.Equal(42, db.LeadCaptures.Single().UserId);
    }

    [Fact]
    public async Task Site_booking_creates_one_lead_with_the_booking_data()
    {
        var (svc, db, _) = Build();

        var result = await svc.CreateFromAppointmentAsync(Booking());

        Assert.True(result.Created);
        var lead = db.LeadCaptures.Single();
        Assert.Equal("appointment", lead.Source);
        Assert.Equal(1, lead.BrokerProfileId);
        Assert.Equal("Popescu Ana", lead.NumePrenume);
        Assert.Equal(5000, lead.VenitNetLunar);
        Assert.True(lead.Intarzieri);
        Assert.Equal(60, lead.IntarzieriZileMax);
        Assert.True(lead.PoprireSauExecutorUltimii5Ani);
        Assert.Equal(LeadStatuses.New, lead.Status);
    }

    [Fact]
    public async Task Same_phone_for_the_same_broker_does_not_create_a_second_lead()
    {
        var (svc, db, _) = Build();

        var first = await svc.CreateFromAppointmentAsync(Booking(phone: "0722 000 111"));
        var again = await svc.CreateFromAppointmentAsync(Booking(phone: "+40722000111"));

        Assert.True(first.Created);
        Assert.False(again.Created);
        Assert.Equal(first.Lead.Id, again.Lead.Id);
        Assert.Single(db.LeadCaptures);
    }

    [Fact]
    public async Task Same_phone_for_another_broker_gets_its_own_lead()
    {
        var (svc, db, _) = Build();

        await svc.CreateFromAppointmentAsync(Booking(broker: 1));
        var other = await svc.CreateFromAppointmentAsync(Booking(broker: 2));
        var inbox = await svc.CreateFromAppointmentAsync(Booking(broker: null));

        Assert.True(other.Created);
        Assert.True(inbox.Created);
        Assert.Equal(3, db.LeadCaptures.Count());
    }
}
