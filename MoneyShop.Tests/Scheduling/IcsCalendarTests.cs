using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Scheduling;

namespace MoneyShop.Tests.Scheduling;

public class IcsCalendarTests
{
    private static readonly DateTime Start = new(2030, 1, 7, 9, 30, 0, DateTimeKind.Utc);

    private static string[] Lines(string ics) => ics.Split("\r\n");

    [Fact]
    public void Invitation_is_a_request_in_utc_with_end_from_duration()
    {
        var ics = IcsCalendar.Invitation(new IcsEvent("appointment-5@moneyshop.ro", Start, 15, "Apel MoneyShop", Sequence: 3,
            OrganizerEmail: "noreply@moneyshop.ro", AttendeeEmail: "ana@example.com"));
        var lines = Lines(ics);

        Assert.Equal("BEGIN:VCALENDAR", lines[0]);
        Assert.Contains("METHOD:REQUEST", lines);
        Assert.Contains("UID:appointment-5@moneyshop.ro", lines);
        Assert.Contains("DTSTART:20300107T093000Z", lines);
        Assert.Contains("DTEND:20300107T094500Z", lines);
        Assert.Contains("SEQUENCE:3", lines);
        Assert.Contains("STATUS:CONFIRMED", lines);
        Assert.Contains("BEGIN:VALARM", lines);
        Assert.Contains("ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:ana@example.com", lines);
        Assert.EndsWith("END:VCALENDAR\r\n", ics);
    }

    [Fact]
    public void Cancelled_invitation_uses_cancel_method_and_no_alarm()
    {
        var lines = Lines(IcsCalendar.Invitation(new IcsEvent("appointment-5@moneyshop.ro", Start, 15, "Apel", Cancelled: true)));
        Assert.Contains("METHOD:CANCEL", lines);
        Assert.Contains("STATUS:CANCELLED", lines);
        Assert.DoesNotContain("BEGIN:VALARM", lines);
    }

    [Fact]
    public void Text_is_escaped()
    {
        const char bs = (char)92; // backslash
        Assert.Equal($"a{bs}, b{bs}; c{bs}{bs}d{bs}ne", IcsCalendar.Escape($"a, b; c{bs}d\ne"));
    }

    [Fact]
    public void Long_lines_are_folded_at_75_bytes_without_splitting_characters()
    {
        var summary = string.Concat(Enumerable.Repeat("Programare țintă ", 12));
        var ics = IcsCalendar.Feed("Test", new[] { new IcsEvent("u1", Start, 15, summary) });

        foreach (var line in Lines(ics))
            Assert.True(Encoding.UTF8.GetByteCount(line) <= 75, $"Line too long: {line}");
        var unfolded = ics.Replace("\r\n ", "");
        Assert.Contains("SUMMARY:" + IcsCalendar.Escape(summary), unfolded);
    }

    [Fact]
    public void Sequence_grows_with_each_update()
    {
        Assert.True(IcsCalendar.SequenceFor(Start.AddMinutes(1)) > IcsCalendar.SequenceFor(Start));
        Assert.Equal(0, IcsCalendar.SequenceFor(new DateTime(2019, 1, 1, 0, 0, 0, DateTimeKind.Utc)));
    }
}

public class CalendarFeedServiceTests
{
    private static readonly DateTime Now = new(2030, 1, 7, 8, 0, 0, DateTimeKind.Utc);

    private static (CalendarFeedService Service, MoneyShopDbContext Db) Build(string? key = null)
    {
        var db = new MoneyShopDbContext(new DbContextOptionsBuilder<MoneyShopDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["JwtSettings:SecretKey"] = key ?? new string('a', 40) }).Build();
        db.BrokerProfiles.Add(new BrokerProfile { Id = 1, UserId = 10, Slug = "alex", DisplayName = "Alex Moore", Status = "Active" });
        db.BrokerProfiles.Add(new BrokerProfile { Id = 2, UserId = 11, Slug = "maria", DisplayName = "Maria", Status = "Active" });
        db.BrokerProfiles.Add(new BrokerProfile { Id = 3, UserId = 12, Slug = "susp", DisplayName = "Suspendat", Status = "Suspended" });
        db.SaveChanges();
        return (new CalendarFeedService(db, config), db);
    }

    private static void Add(MoneyShopDbContext db, int broker, DateTime? start, string status = "Nou", DateTime? cancelledAt = null,
        string source = "manual", DateTime? confirmedAt = null, string prenume = "Ana")
    {
        db.Appointments.Add(new Appointment
        {
            BrokerProfileId = broker, Nume = "Popescu", Prenume = prenume, Judet = "", TipCredit = "Nevoi personale", Telefon = "0722000000",
            Email = "ana@example.com", Status = status, ScheduledAt = start, DurationMinutes = 15, Source = source,
            ConfirmedAt = confirmedAt, CancelledAt = cancelledAt, CreatedAt = Now, UpdatedAt = Now,
        });
        db.SaveChanges();
    }

    [Fact]
    public void Token_is_stable_per_broker_and_checked()
    {
        var (service, _) = Build();
        var token = service.TokenFor(1);
        Assert.Equal(token, service.TokenFor(1));
        Assert.NotEqual(token, service.TokenFor(2));
        Assert.True(service.IsValidToken(1, token));
        Assert.False(service.IsValidToken(2, token));
        Assert.False(service.IsValidToken(1, token + "x"));
        Assert.False(service.IsValidToken(1, null));
        Assert.DoesNotContain('/', token);
        Assert.DoesNotContain('+', token);
    }

    [Fact]
    public void Changing_the_key_revokes_links()
    {
        var token = Build().Service.TokenFor(1);
        Assert.False(Build(new string('b', 40)).Service.IsValidToken(1, token));
    }

    [Fact]
    public async Task Feed_has_only_this_brokers_live_appointments_in_the_window()
    {
        var (service, db) = Build();
        Add(db, 1, Now.AddDays(1), prenume: "Ana");
        Add(db, 1, Now.AddDays(2), status: "Anulat", prenume: "Anulata");
        Add(db, 1, Now.AddDays(3), cancelledAt: Now, prenume: "Retrasa");
        Add(db, 1, Now.AddDays(200), prenume: "Departe");
        Add(db, 1, Now.AddDays(-60), prenume: "Veche");
        Add(db, 1, null, prenume: "FaraOra");
        Add(db, 1, Now.AddDays(1).AddHours(1), source: "site", prenume: "Site");
        Add(db, 2, Now.AddDays(1), prenume: "AltBroker");

        var ics = (await service.BuildFeedAsync(1, Now))!.Replace("\r\n ", "");

        Assert.Contains("METHOD:PUBLISH", ics);
        Assert.Contains("X-WR-CALNAME:MoneyShop – Alex Moore", ics);
        Assert.Contains("SUMMARY:Apel: Ana Popescu", ics);
        Assert.Contains("SUMMARY:[neconfirmat] Apel: Site Popescu", ics);
        Assert.Contains(@"Telefon: 0722000000\n", ics);
        Assert.Equal(2, ics.Split("BEGIN:VEVENT").Length - 1);
        Assert.DoesNotContain("ana@example.com", ics);
        foreach (var name in new[] { "Anulata", "Retrasa", "Departe", "Veche", "FaraOra", "AltBroker" })
            Assert.DoesNotContain(name, ics);
    }

    [Fact]
    public async Task No_feed_for_a_suspended_or_unknown_broker()
    {
        var (service, _) = Build();
        Assert.Null(await service.BuildFeedAsync(3, Now));
        Assert.Null(await service.BuildFeedAsync(99, Now));
    }
}
