using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Scheduling.Outlook;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.Tests.Scheduling;

public class OutlookSyncServiceTests
{
    private static readonly DateTime Now = new(2030, 1, 7, 8, 0, 0, DateTimeKind.Utc);
    private const string AlexMailbox = "alex.moore@moneyshop.ro";

    private static (OutlookSyncService Sync, MoneyShopDbContext Db, FakeOutlook Outlook) Build(bool enabled = true)
    {
        var db = new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.BrokerProfiles.Add(new BrokerProfile { Id = 1, UserId = 10, Slug = "alex", DisplayName = "Alex", Status = "Active", NotificationEmail = AlexMailbox });
        db.BrokerProfiles.Add(new BrokerProfile { Id = 2, UserId = 11, Slug = "ext", DisplayName = "Extern", Status = "Active", NotificationEmail = "broker@gmail.com" });
        db.SaveChanges();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>()).Build();
        var outlook = new FakeOutlook(enabled, config);
        return (new OutlookSyncService(db, outlook, config, NullLogger<OutlookSyncService>.Instance), db, outlook);
    }

    private static Appointment Add(MoneyShopDbContext db, int broker, DateTime? start, string prenume = "Ana", string status = "Nou",
        string source = "manual", DateTime? confirmedAt = null, DateTime? createdAt = null)
    {
        var a = new Appointment
        {
            BrokerProfileId = broker, Nume = "Popescu", Prenume = prenume, Judet = "", TipCredit = "Ipotecar", Telefon = "0722000000",
            Email = "ana@example.com", Status = status, ScheduledAt = start, DurationMinutes = 15, Source = source,
            ConfirmedAt = confirmedAt, CreatedAt = createdAt ?? Now, UpdatedAt = Now,
        };
        db.Appointments.Add(a);
        db.SaveChanges();
        return a;
    }

    [Fact]
    public async Task Creates_events_only_for_brokers_with_a_company_mailbox()
    {
        var (sync, db, outlook) = Build();
        var a = Add(db, 1, Now.AddDays(1));
        Add(db, 2, Now.AddDays(1));

        var report = await sync.SyncAllAsync(Now);

        Assert.Equal(1, report.Mailboxes);
        Assert.Equal(1, report.Created);
        var ev = Assert.Single(outlook.Events);
        Assert.Equal(AlexMailbox, ev.Mailbox);
        Assert.Equal(a.Id, ev.Item.AppointmentId);
        Assert.Equal(Now.AddDays(1), ev.Item.StartUtc);
        Assert.Equal(Now.AddDays(1).AddMinutes(15), ev.Item.EndUtc);
        Assert.StartsWith("Apel MoneyShop: Ana Popescu", ev.Subject);
        Assert.Contains("0722000000", ev.Body);
        Assert.DoesNotContain("ana@example.com", ev.Body);
    }

    [Fact]
    public async Task Second_run_changes_nothing()
    {
        var (sync, db, _) = Build();
        Add(db, 1, Now.AddDays(1));
        await sync.SyncAllAsync(Now);

        var again = await sync.SyncAllAsync(Now);

        Assert.Equal((0, 0, 0), (again.Created, again.Updated, again.Deleted));
    }

    [Fact]
    public async Task Moved_appointments_are_updated_and_cancelled_ones_removed()
    {
        var (sync, db, outlook) = Build();
        var moved = Add(db, 1, Now.AddDays(1), prenume: "Mutat");
        var cancelled = Add(db, 1, Now.AddDays(2), prenume: "Anulat");
        await sync.SyncAllAsync(Now);

        moved.ScheduledAt = Now.AddDays(3);
        cancelled.Status = "Anulat";
        db.SaveChanges();
        var report = await sync.SyncAllAsync(Now);

        Assert.Equal((0, 1, 1), (report.Created, report.Updated, report.Deleted));
        var ev = Assert.Single(outlook.Events);
        Assert.Equal(moved.Id, ev.Item.AppointmentId);
        Assert.Equal(Now.AddDays(3), ev.Item.StartUtc);
    }

    [Fact]
    public async Task A_time_changed_by_hand_in_Outlook_is_put_back()
    {
        var (sync, db, outlook) = Build();
        Add(db, 1, Now.AddDays(1));
        await sync.SyncAllAsync(Now);
        outlook.Events[0] = outlook.Events[0] with { Item = outlook.Events[0].Item with { StartUtc = Now.AddDays(5), EndUtc = Now.AddDays(5).AddMinutes(15) } };

        var report = await sync.SyncAllAsync(Now);

        Assert.Equal(1, report.Updated);
        Assert.Equal(Now.AddDays(1), outlook.Events[0].Item.StartUtc);
    }

    [Fact]
    public async Task The_brokers_own_meetings_and_duplicates()
    {
        var (sync, db, outlook) = Build();
        var a = Add(db, 1, Now.AddDays(1));
        outlook.Seed(AlexMailbox, new OutlookCalendarItem("own", null, null, Now.AddDays(1), Now.AddDays(1).AddHours(1), "busy", false));
        await sync.SyncAllAsync(Now);
        outlook.Seed(AlexMailbox, outlook.Events.Single(e => e.Item.AppointmentId == a.Id).Item with { EventId = "dup" });

        var report = await sync.SyncAllAsync(Now);

        Assert.Equal(1, report.Deleted);
        Assert.Contains(outlook.Events, e => e.Item.EventId == "own");
        Assert.Single(outlook.Events, e => e.Item.AppointmentId == a.Id);
    }

    [Fact]
    public async Task Expired_unconfirmed_site_holds_and_far_or_unscheduled_ones_are_left_out()
    {
        var (sync, db, outlook) = Build();
        Add(db, 1, Now.AddDays(1), source: "site", createdAt: Now.AddHours(-30));
        var pending = Add(db, 1, Now.AddDays(1).AddHours(1), source: "site", createdAt: Now.AddHours(-1));
        Add(db, 1, Now.AddDays(200));
        Add(db, 1, null);

        await sync.SyncAllAsync(Now);

        var ev = Assert.Single(outlook.Events);
        Assert.Equal(pending.Id, ev.Item.AppointmentId);
        Assert.StartsWith("[neconfirmat]", ev.Subject);
    }

    [Fact]
    public async Task Does_nothing_when_Graph_is_not_configured()
    {
        var (sync, db, outlook) = Build(enabled: false);
        Add(db, 1, Now.AddDays(1));

        var report = await sync.SyncAllAsync(Now);

        Assert.Equal(0, report.Mailboxes);
        Assert.Empty(outlook.Events);
    }

    [Fact]
    public async Task Busy_times_skip_moneyshop_events_free_time_and_cancelled_meetings()
    {
        var (_, db, outlook) = Build();
        outlook.Seed(AlexMailbox, new OutlookCalendarItem("m1", null, null, Now.AddHours(2), Now.AddHours(3), "busy", false));
        outlook.Seed(AlexMailbox, new OutlookCalendarItem("m2", null, null, Now.AddHours(4), Now.AddHours(5), "free", false));
        outlook.Seed(AlexMailbox, new OutlookCalendarItem("m3", null, null, Now.AddHours(6), Now.AddHours(7), "busy", true));
        outlook.Seed(AlexMailbox, new OutlookCalendarItem("ours", 99, "v", Now.AddHours(8), Now.AddHours(9), "busy", false));
        OutlookBusyTimes.ClearCache();
        var busyTimes = new OutlookBusyTimes(db, outlook, NullLogger<OutlookBusyTimes>.Instance);

        var busy = await busyTimes.GetAsync(1, Now, Now.AddDays(1), Now);

        var only = Assert.Single(busy);
        Assert.Equal(Now.AddHours(2), only.StartUtc);
        Assert.Empty(await busyTimes.GetAsync(2, Now, Now.AddDays(1), Now)); // no company mailbox
        OutlookBusyTimes.ClearCache();
    }

    [Fact]
    public void Graph_events_are_read_with_the_moneyshop_properties()
    {
        var json = $$"""
        {
          "id": "AAMk1",
          "start": { "dateTime": "2030-01-07T09:30:00.0000000", "timeZone": "UTC" },
          "end": { "dateTime": "2030-01-07T09:45:00.0000000", "timeZone": "UTC" },
          "showAs": "busy",
          "isCancelled": false,
          "singleValueExtendedProperties": [
            { "id": "{{GraphOutlookCalendar.AppointmentIdProperty}}", "value": "42" },
            { "id": "{{GraphOutlookCalendar.VersionProperty}}", "value": "abc" }
          ]
        }
        """;

        var item = GraphOutlookCalendar.ParseItem(JsonDocument.Parse(json).RootElement);

        Assert.Equal(42, item.AppointmentId);
        Assert.Equal("abc", item.Version);
        Assert.Equal(new DateTime(2030, 1, 7, 9, 30, 0, DateTimeKind.Utc), item.StartUtc);
        Assert.Equal(DateTimeKind.Utc, item.StartUtc.Kind);
    }

    [Fact]
    public void Mailbox_is_the_company_address_or_the_configured_one()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Graph:Mailboxes:maria"] = "maria@moneyshop.ro" }).Build();

        Assert.Equal("alex.moore@moneyshop.ro", OutlookMailbox.Resolve(config, "moneyshop.ro", "alex", "alex.moore@moneyshop.ro", null));
        Assert.Equal("a@moneyshop.ro", OutlookMailbox.Resolve(config, "moneyshop.ro", "x", "x@gmail.com", "a@moneyshop.ro"));
        Assert.Null(OutlookMailbox.Resolve(config, "moneyshop.ro", "x", "x@gmail.com", null));
        Assert.Equal("maria@moneyshop.ro", OutlookMailbox.Resolve(config, "moneyshop.ro", "maria", "maria@gmail.com", null));
    }

    private sealed record Stored(string Mailbox, OutlookCalendarItem Item, string Subject, string Body);

    private sealed class FakeOutlook : IOutlookCalendar
    {
        private readonly IConfiguration _config;
        private int _next;
        public List<Stored> Events { get; } = new();

        public FakeOutlook(bool enabled, IConfiguration config) { Enabled = enabled; _config = config; }

        public bool Enabled { get; }

        public string? MailboxFor(string? slug, string? notificationEmail, string? publicEmail) =>
            OutlookMailbox.Resolve(_config, "moneyshop.ro", slug, notificationEmail, publicEmail);

        public void Seed(string mailbox, OutlookCalendarItem item) => Events.Add(new Stored(mailbox, item, "", ""));

        public Task<List<OutlookCalendarItem>> ListAsync(string mailbox, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default) =>
            Task.FromResult(Events.Where(e => e.Mailbox == mailbox && e.Item.StartUtc < toUtc && e.Item.EndUtc > fromUtc).Select(e => e.Item).ToList());

        public Task CreateAsync(string mailbox, OutlookEvent ev, CancellationToken ct = default)
        {
            Events.Add(new Stored(mailbox, Item($"e{++_next}", ev), ev.Subject, ev.Body));
            return Task.CompletedTask;
        }

        public Task UpdateAsync(string mailbox, string eventId, OutlookEvent ev, CancellationToken ct = default)
        {
            var i = Events.FindIndex(e => e.Mailbox == mailbox && e.Item.EventId == eventId);
            Events[i] = new Stored(mailbox, Item(eventId, ev), ev.Subject, ev.Body);
            return Task.CompletedTask;
        }

        public Task DeleteAsync(string mailbox, string eventId, CancellationToken ct = default)
        {
            Events.RemoveAll(e => e.Mailbox == mailbox && e.Item.EventId == eventId);
            return Task.CompletedTask;
        }

        private static OutlookCalendarItem Item(string id, OutlookEvent ev) =>
            new(id, ev.AppointmentId, ev.Version, ev.StartUtc, ev.EndUtc, "busy", false);
    }
}
