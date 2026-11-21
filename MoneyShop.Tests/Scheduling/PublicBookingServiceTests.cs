using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Scheduling;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.Tests.Scheduling;

public class PublicBookingServiceTests
{
    private const int Alex = 1;   // default broker (no slug)
    private const int Maria = 2;
    // Monday 7 January 2030, 08:00 UTC. Booking hours in the test: 09:00–11:00 UTC, every 30 min, 15 min calls.
    private static readonly DateTime Now = new(2030, 1, 7, 8, 0, 0, DateTimeKind.Utc);
    private static DateTime At(int hour, int minute = 0, int day = 7) => new(2030, 1, day, hour, minute, 0, DateTimeKind.Utc);

    private static (PublicBookingService Service, MoneyShopDbContext Db) Build()
    {
        var options = new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new MoneyShopDbContext(options);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Booking:TimeZone"] = "UTC",
            ["Booking:Days"] = "Mon,Tue",
            ["Booking:Start"] = "09:00",
            ["Booking:End"] = "11:00",
            ["Booking:StepMinutes"] = "30",
            ["Booking:DurationMinutes"] = "15",
            ["Booking:LeadMinutes"] = "0",
            ["Booking:DaysAhead"] = "1",
        }).Build();
        return (new PublicBookingService(db, new FakeBrokers(), config), db);
    }

    private static Appointment Add(MoneyShopDbContext db, int? broker, DateTime start, string source = "manual",
        DateTime? confirmedAt = null, DateTime? createdAt = null, string? tokenHash = null, string email = "")
    {
        var a = new Appointment
        {
            BrokerProfileId = broker, Nume = "Popescu", Prenume = "Ana", Judet = "", TipCredit = "", Telefon = "0722000000",
            Email = email, Status = "Nou", ScheduledAt = start, DurationMinutes = 15, Source = source,
            ConfirmedAt = confirmedAt, ConfirmationTokenHash = tokenHash,
            CreatedAt = createdAt ?? Now.AddHours(-1), UpdatedAt = Now,
        };
        db.Appointments.Add(a);
        db.SaveChanges();
        return a;
    }

    private static List<DateTime> Times(List<BookingDay> days) => days.SelectMany(d => d.Slots.Select(s => s.StartUtc)).ToList();

    [Fact]
    public async Task Slots_hide_times_taken_on_the_broker_calendar_and_by_unassigned_bookings()
    {
        var (service, db) = Build();
        Add(db, Alex, At(9, 30));          // Alex busy 09:30
        Add(db, null, At(10, 0));          // waiting in the Super Admin inbox
        Add(db, Maria, At(10, 30));        // another broker: does not matter for Alex

        var times = Times(await service.GetSlotsAsync(brokerSlug: null, Now));

        Assert.Contains(At(9), times);
        Assert.DoesNotContain(At(9, 30), times);
        Assert.DoesNotContain(At(10), times);
        Assert.Contains(At(10, 30), times);
        Assert.Contains(At(9, day: 8), times); // next working day
    }

    [Fact]
    public async Task An_unconfirmed_site_booking_stops_blocking_after_the_hold()
    {
        var (service, db) = Build();
        Add(db, Alex, At(9), source: "site", createdAt: Now.AddHours(-30));   // expired hold
        Add(db, Alex, At(9, 30), source: "site", createdAt: Now.AddHours(-1)); // still held

        var times = Times(await service.GetSlotsAsync(null, Now));

        Assert.Contains(At(9), times);
        Assert.DoesNotContain(At(9, 30), times);
    }

    [Theory]
    [InlineData(9, 10)]   // not on the 30-minute grid
    [InlineData(11, 0)]   // after closing (call would end 11:15)
    [InlineData(7, 30)]   // before opening / already past
    public async Task Only_offered_times_are_bookable(int hour, int minute)
    {
        var (service, _) = Build();

        Assert.False(await service.IsBookableAsync(Alex, At(hour, minute), Now));
    }

    [Fact]
    public async Task Weekend_and_days_outside_the_window_have_no_slots()
    {
        var (service, _) = Build();

        var days = await service.GetSlotsAsync(null, Now);

        Assert.Equal(new[] { "2030-01-07", "2030-01-08" }, days.Select(d => d.Date));
    }

    [Fact]
    public async Task The_private_link_confirms_moves_and_cancels_the_booking()
    {
        var (service, db) = Build();
        var token = service.NewToken(out var hash);
        var booking = Add(db, Alex, At(9), source: "site", tokenHash: hash);
        Add(db, Alex, At(10));

        Assert.Equal(BookingStatus.Pending, (await service.GetByTokenAsync(token, Now))!.Status);

        var confirmed = await service.ConfirmAsync(token, Now);
        Assert.True(confirmed.Ok);
        Assert.Equal(BookingStatus.Confirmed, confirmed.Booking!.Status);

        var taken = await service.RescheduleAsync(token, At(10), Now);
        Assert.Equal(BookingActionError.SlotTaken, taken.Error);

        var moved = await service.RescheduleAsync(token, At(10, 30), Now);
        Assert.True(moved.Ok);
        Assert.Equal(At(10, 30), db.Appointments.Single(a => a.Id == booking.Id).ScheduledAt);

        var cancelled = await service.CancelAsync(token, Now);
        Assert.Equal(BookingStatus.Cancelled, cancelled.Booking!.Status);
        Assert.Equal(BookingActionError.Cancelled, (await service.ConfirmAsync(token, Now)).Error);
        Assert.Contains(At(10, 30), Times(await service.GetSlotsAsync(null, Now)));
    }

    [Fact]
    public async Task Unknown_or_tampered_links_are_not_found()
    {
        var (service, db) = Build();
        service.NewToken(out var hash);
        Add(db, Alex, At(9), source: "site", tokenHash: hash);

        Assert.Null(await service.GetByTokenAsync("not-a-real-token", Now));
        Assert.Equal(BookingActionError.NotFound, (await service.CancelAsync(hash, Now)).Error); // the hash is not the token
    }

    [Fact]
    public async Task Reminders_go_out_once_the_day_before_and_half_an_hour_before()
    {
        var (service, db) = Build();
        var dayBefore = Add(db, Alex, Now.AddHours(20), confirmedAt: Now.AddDays(-2), email: "a@example.com");
        var soon = Add(db, Alex, Now.AddMinutes(20), confirmedAt: Now.AddDays(-2), email: "b@example.com");
        Add(db, Alex, Now.AddHours(20), confirmedAt: Now.AddHours(-1), email: "c@example.com"); // booked < 24 h ahead
        Add(db, Alex, Now.AddHours(3), confirmedAt: null, email: "d@example.com");               // not confirmed
        Add(db, Alex, Now.AddMinutes(10), confirmedAt: Now.AddDays(-1), email: "");                // no email

        var due = await service.GetDueRemindersAsync(Now);

        Assert.Equal(2, due.Count);
        Assert.Contains(due, d => d.AppointmentId == dayBefore.Id && d.Kind == ReminderKind.DayBefore);
        Assert.Contains(due, d => d.AppointmentId == soon.Id && d.Kind == ReminderKind.HalfHourBefore);

        foreach (var d in due) await service.MarkReminderSentAsync(d.AppointmentId, d.Kind, Now);
        Assert.Empty(await service.GetDueRemindersAsync(Now));
    }

    private sealed class FakeBrokers : IBrokerProfileService
    {
        public int? ResolveIntakeBrokerId(string? slug) => slug == "maria" ? Maria : Alex;
        public int? ResolvePublicLeadBrokerId(string? slug) => slug == "maria" ? Maria : null;
        public Dictionary<int, string> GetDisplayNames() => new() { [Alex] = "Alex", [Maria] = "Maria" };
        public string? GetNotificationEmail(int? brokerProfileId) => null;
        public BrokerPublicProfile? GetPublicProfile(string slug) => throw new NotImplementedException();
        public BrokerLegalIdentity? GetLegalIdentity(int? brokerProfileId) => throw new NotImplementedException();
        public BrokerProfileView? GetForUser(int userId) => throw new NotImplementedException();
        public BrokerSaveResult UpdateOwn(int userId, BrokerSelfUpdateInput input) => throw new NotImplementedException();
        public List<BrokerAdminItem> ListForAdmin() => throw new NotImplementedException();
        public BrokerProfileView? GetForAdmin(int id) => throw new NotImplementedException();
        public BrokerSaveResult Create(BrokerCreateInput input) => throw new NotImplementedException();
        public BrokerSaveResult Update(int id, BrokerAdminUpdateInput input) => throw new NotImplementedException();
        public BrokerSaveResult SetPassword(int id, string password) => throw new NotImplementedException();
    }
}
