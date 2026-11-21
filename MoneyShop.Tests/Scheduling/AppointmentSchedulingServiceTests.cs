using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Scheduling;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.Tests.Scheduling;

public class AppointmentSchedulingServiceTests
{
    private const int Alex = 1;
    private const int Maria = 2;
    // Tomorrow 10:00 UTC, so every test time is inside the allowed window.
    private static readonly DateTime Ten = DateTime.UtcNow.Date.AddDays(1).AddHours(10);

    private static (AppointmentSchedulingService Service, MoneyShopDbContext Db) Build()
    {
        var options = new DbContextOptionsBuilder<MoneyShopDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new MoneyShopDbContext(options);

        // Alex: 10:00–10:30 booked, 11:00–11:15 cancelled. Maria: 10:00–10:15.
        db.Appointments.AddRange(
            Scheduled(1, Alex, Ten, 30, "Nou"),
            Scheduled(2, Alex, Ten.AddHours(1), 15, SchedulingRules.CancelledStatus),
            Scheduled(3, Maria, Ten, 15, "Nou"));
        db.SaveChanges();
        db.ChangeTracker.Clear();
        return (new AppointmentSchedulingService(db), db);
    }

    private static Appointment Scheduled(int id, int broker, DateTime start, int minutes, string status) => new()
    {
        Id = id, BrokerProfileId = broker, Nume = "Client", Prenume = id.ToString(), Judet = "", TipCredit = "",
        Telefon = "0722000000", Email = "", Status = status, ScheduledAt = start, DurationMinutes = minutes,
        CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
    };

    private static ManualAppointmentInput At(DateTime start, int minutes = 15) => new()
    {
        Nume = "Ionescu", Prenume = "Ana", Telefon = "0722111222", ScheduledAt = start, DurationMinutes = minutes,
    };

    [Theory]
    [InlineData(0, 15)]    // same start
    [InlineData(15, 15)]   // starts inside
    [InlineData(-10, 15)]  // ends inside
    [InlineData(-30, 120)] // wraps it
    public async Task Overlapping_booking_for_the_same_broker_is_refused(int offsetMinutes, int minutes)
    {
        var (service, db) = Build();

        var outcome = await service.CreateManualAsync(At(Ten.AddMinutes(offsetMinutes), minutes), Alex, actorUserId: 5);

        Assert.Equal(ScheduleError.Conflict, outcome.Error);
        Assert.Equal(1, outcome.Conflict!.AppointmentId);
        Assert.Equal(3, db.Appointments.Count());
    }

    [Theory]
    [InlineData(30)]   // starts exactly when the 10:00–10:30 one ends
    [InlineData(-15)]  // ends exactly when it starts
    public async Task Back_to_back_bookings_are_allowed(int offsetMinutes)
    {
        var (service, _) = Build();

        var outcome = await service.CreateManualAsync(At(Ten.AddMinutes(offsetMinutes)), Alex, actorUserId: 5);

        Assert.True(outcome.Ok);
    }

    [Fact]
    public async Task Cancelled_appointments_and_other_brokers_do_not_block_the_slot()
    {
        var (service, db) = Build();

        var overCancelled = await service.CreateManualAsync(At(Ten.AddHours(1)), Alex, actorUserId: 5);
        var otherBroker = await service.CreateManualAsync(At(Ten.AddMinutes(30)), Maria, actorUserId: 5);

        Assert.True(overCancelled.Ok);
        Assert.True(otherBroker.Ok);
        var created = db.Appointments.Single(a => a.Id == overCancelled.AppointmentId);
        Assert.Equal("manual", created.Source);
        Assert.Equal(5, created.CreatedByUserId);
        Assert.Equal(Alex, created.BrokerProfileId);
    }

    [Fact]
    public async Task Rescheduling_ignores_the_appointment_itself_but_not_the_others()
    {
        var (service, db) = Build();

        var shortened = await service.RescheduleAsync(1, Ten.AddMinutes(5), 20);
        var ontoMaria = await service.RescheduleAsync(3, Ten.AddMinutes(10), 15); // Maria has nothing else
        var collides = await service.RescheduleAsync(2, Ten.AddMinutes(10), 15);  // onto Alex's 10:05–10:25

        Assert.True(shortened.Ok);
        Assert.True(ontoMaria.Ok);
        Assert.Equal(ScheduleError.Conflict, collides.Error);
        Assert.Equal(20, db.Appointments.Single(a => a.Id == 1).DurationMinutes);
    }

    [Fact]
    public async Task Unassigned_appointments_are_never_in_conflict()
    {
        var (service, _) = Build();

        var outcome = await service.CreateManualAsync(At(Ten), ownerBrokerProfileId: null, actorUserId: 5);

        Assert.True(outcome.Ok);
    }

    [Theory]
    [InlineData("", "0722111222", 15, ScheduleError.MissingName)]
    [InlineData("Ana", "", 15, ScheduleError.MissingPhone)]
    [InlineData("Ana", "0722111222", 1, ScheduleError.InvalidDuration)]
    [InlineData("Ana", "0722111222", 600, ScheduleError.InvalidDuration)]
    public async Task Invalid_input_is_rejected(string name, string phone, int minutes, ScheduleError expected)
    {
        var (service, _) = Build();

        var outcome = await service.CreateManualAsync(
            new ManualAppointmentInput { Nume = name, Telefon = phone, ScheduledAt = Ten.AddDays(2), DurationMinutes = minutes }, Alex, 5);

        Assert.Equal(expected, outcome.Error);
    }

    [Fact]
    public async Task Times_far_in_the_past_are_rejected()
    {
        var (service, _) = Build();

        var outcome = await service.CreateManualAsync(At(DateTime.UtcNow.AddDays(-3)), Alex, 5);

        Assert.Equal(ScheduleError.InvalidTime, outcome.Error);
    }
}
