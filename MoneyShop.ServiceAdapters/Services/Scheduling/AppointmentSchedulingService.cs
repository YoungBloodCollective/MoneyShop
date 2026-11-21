using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.ServiceAdapters.Services.Scheduling;

public class AppointmentSchedulingService : IAppointmentSchedulingService
{
    private static readonly TimeSpan MaxPast = TimeSpan.FromDays(1);
    private static readonly TimeSpan MaxFuture = TimeSpan.FromDays(366);

    private readonly MoneyShopDbContext _db;

    public AppointmentSchedulingService(MoneyShopDbContext db)
    {
        _db = db;
    }

    public async Task<SlotConflict?> FindConflictAsync(int? brokerProfileId, DateTime startUtc, int durationMinutes, int? excludeAppointmentId = null)
    {
        // Appointments without a broker are not on anybody's calendar yet.
        if (brokerProfileId == null) return null;

        var start = AsUtc(startUtc);
        var end = start.AddMinutes(durationMinutes);
        // Overlap: existing.start < new.end AND existing.end > new.start. The end check is done in
        // memory on the few candidates that start within the longest possible duration before us.
        var windowStart = start.AddMinutes(-SchedulingRules.MaxDuration);
        var holdCutoff = DateTime.UtcNow.AddHours(-SchedulingRules.UnconfirmedHoldHours);
        var candidates = await _db.Appointments.AsNoTracking()
            .Where(a => a.BrokerProfileId == brokerProfileId
                && a.ScheduledAt != null
                && a.ScheduledAt < end
                && a.ScheduledAt > windowStart
                && a.Status != SchedulingRules.CancelledStatus
                && a.CancelledAt == null
                // A time booked on the site and never confirmed stops blocking the slot after the hold.
                && !(a.Source == SchedulingRules.SiteSource && a.ConfirmedAt == null && a.CreatedAt < holdCutoff)
                && (excludeAppointmentId == null || a.Id != excludeAppointmentId))
            .Select(a => new { a.Id, a.Nume, a.Prenume, a.ScheduledAt, a.DurationMinutes })
            .ToListAsync();

        var hit = candidates
            .Where(a => a.ScheduledAt!.Value.AddMinutes(a.DurationMinutes) > start)
            .OrderBy(a => a.ScheduledAt)
            .FirstOrDefault();
        return hit == null
            ? null
            : new SlotConflict(hit.Id, $"{hit.Nume} {hit.Prenume}".Trim(), DateTime.SpecifyKind(hit.ScheduledAt!.Value, DateTimeKind.Utc), hit.DurationMinutes);
    }

    public async Task<ScheduleOutcome> CreateManualAsync(ManualAppointmentInput input, int? ownerBrokerProfileId, int? actorUserId)
    {
        if (string.IsNullOrWhiteSpace(input.Nume)) return ScheduleOutcome.Fail(ScheduleError.MissingName);
        if (string.IsNullOrWhiteSpace(input.Telefon)) return ScheduleOutcome.Fail(ScheduleError.MissingPhone);
        var validation = Validate(input.ScheduledAt, input.DurationMinutes);
        if (validation != ScheduleError.None) return ScheduleOutcome.Fail(validation);

        var start = AsUtc(input.ScheduledAt);
        var conflict = await FindConflictAsync(ownerBrokerProfileId, start, input.DurationMinutes);
        if (conflict != null) return ScheduleOutcome.Fail(ScheduleError.Conflict, conflict);

        var now = DateTime.UtcNow;
        var appointment = new Appointment
        {
            BrokerProfileId = ownerBrokerProfileId,
            Nume = input.Nume.Trim(),
            Prenume = input.Prenume?.Trim() ?? "",
            Telefon = input.Telefon.Trim(),
            Email = input.Email?.Trim() ?? "",
            TipCredit = input.TipCredit?.Trim() ?? "",
            Judet = input.Judet?.Trim() ?? "",
            Notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim(),
            SalariuNet = 0,
            Status = "Nou",
            ScheduledAt = start,
            DurationMinutes = input.DurationMinutes,
            Source = "manual",
            CreatedByUserId = actorUserId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        _db.Appointments.Add(appointment);
        await _db.SaveChangesAsync();
        return new ScheduleOutcome { AppointmentId = appointment.Id };
    }

    public async Task<ScheduleOutcome> RescheduleAsync(int appointmentId, DateTime scheduledAtUtc, int durationMinutes)
    {
        var validation = Validate(scheduledAtUtc, durationMinutes);
        if (validation != ScheduleError.None) return ScheduleOutcome.Fail(validation);

        // The broker scope filter applies here: a broker can only move their own appointments.
        var appointment = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == appointmentId);
        if (appointment == null) return ScheduleOutcome.Fail(ScheduleError.NotFound);

        var start = AsUtc(scheduledAtUtc);
        var conflict = await FindConflictAsync(appointment.BrokerProfileId, start, durationMinutes, appointment.Id);
        if (conflict != null) return ScheduleOutcome.Fail(ScheduleError.Conflict, conflict);

        appointment.ScheduledAt = start;
        appointment.DurationMinutes = durationMinutes;
        appointment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new ScheduleOutcome { AppointmentId = appointment.Id };
    }

    private static ScheduleError Validate(DateTime scheduledAt, int durationMinutes)
    {
        if (durationMinutes < SchedulingRules.MinDuration || durationMinutes > SchedulingRules.MaxDuration)
            return ScheduleError.InvalidDuration;
        var start = AsUtc(scheduledAt);
        var now = DateTime.UtcNow;
        if (start < now - MaxPast || start > now + MaxFuture) return ScheduleError.InvalidTime;
        return ScheduleError.None;
    }

    /// <summary>Times arrive as ISO strings from the browser; anything not marked UTC is treated as UTC.</summary>
    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };
}
