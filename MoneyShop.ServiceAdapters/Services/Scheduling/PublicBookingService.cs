using System.Globalization;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.ServiceAdapters.Services.Scheduling;

public class PublicBookingService : IPublicBookingService
{
    private static readonly CultureInfo Ro = CultureInfo.GetCultureInfo("ro-RO");

    private readonly MoneyShopDbContext _db;
    private readonly IBrokerProfileService _brokerProfiles;
    private readonly BookingHours _hours;

    public PublicBookingService(MoneyShopDbContext db, IBrokerProfileService brokerProfiles, IConfiguration configuration)
    {
        _db = db;
        _brokerProfiles = brokerProfiles;
        _hours = BookingHours.From(configuration);
    }

    public int SlotDurationMinutes => _hours.DurationMinutes;

    public async Task<List<BookingDay>> GetSlotsAsync(string? brokerSlug, DateTime nowUtc)
    {
        var capacityBroker = _brokerProfiles.ResolveIntakeBrokerId(brokerSlug);
        var candidates = _hours.CandidateStarts(nowUtc).ToList();
        if (candidates.Count == 0) return new List<BookingDay>();

        var busy = await BusyIntervalsAsync(capacityBroker, candidates[0], candidates[^1].AddMinutes(_hours.DurationMinutes), nowUtc, null);

        return candidates
            .Where(start => !Overlaps(busy, start, _hours.DurationMinutes))
            .GroupBy(start => _hours.ToLocal(start).Date)
            .Take(_hours.DaysShown)
            .Select(g => new BookingDay(
                g.Key.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Ro.TextInfo.ToTitleCase(g.Key.ToString("dddd d MMMM", Ro)),
                g.Select(s => new BookingSlot(s, _hours.ToLocal(s).ToString("HH:mm", CultureInfo.InvariantCulture))).ToList()))
            .ToList();
    }

    public async Task<bool> IsBookableAsync(int? capacityBrokerProfileId, DateTime startUtc, DateTime nowUtc, int? excludeAppointmentId = null)
    {
        var start = AsUtc(startUtc);
        if (!_hours.CandidateStarts(nowUtc).Contains(start)) return false;
        var busy = await BusyIntervalsAsync(capacityBrokerProfileId, start, start.AddMinutes(_hours.DurationMinutes), nowUtc, excludeAppointmentId);
        return !Overlaps(busy, start, _hours.DurationMinutes);
    }

    public string NewToken(out string tokenHash)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
        tokenHash = Hash(token);
        return token;
    }

    public async Task<BookingView?> GetByTokenAsync(string token, DateTime nowUtc)
    {
        var appointment = await FindAsync(token);
        return appointment == null ? null : View(appointment, nowUtc);
    }

    public async Task<BookingActionResult> ConfirmAsync(string token, DateTime nowUtc)
    {
        var appointment = await FindAsync(token);
        var blocked = Blocked(appointment, nowUtc);
        if (blocked != BookingActionError.None) return BookingActionResult.Fail(blocked);

        appointment!.ConfirmedAt ??= nowUtc;
        appointment.UpdatedAt = nowUtc;
        await _db.SaveChangesAsync();
        return Done(appointment, nowUtc);
    }

    public async Task<BookingActionResult> CancelAsync(string token, DateTime nowUtc)
    {
        var appointment = await FindAsync(token);
        var blocked = Blocked(appointment, nowUtc);
        if (blocked != BookingActionError.None) return BookingActionResult.Fail(blocked);

        appointment!.Status = SchedulingRules.CancelledStatus;
        appointment.CancelledAt = nowUtc;
        appointment.UpdatedAt = nowUtc;
        await _db.SaveChangesAsync();
        return Done(appointment, nowUtc);
    }

    public async Task<BookingActionResult> RescheduleAsync(string token, DateTime newStartUtc, DateTime nowUtc)
    {
        var appointment = await FindAsync(token);
        var blocked = Blocked(appointment, nowUtc);
        if (blocked != BookingActionError.None) return BookingActionResult.Fail(blocked);

        var capacity = appointment!.BrokerProfileId ?? _brokerProfiles.ResolveIntakeBrokerId(null);
        var start = AsUtc(newStartUtc);
        if (!await IsBookableAsync(capacity, start, nowUtc, appointment.Id))
            return BookingActionResult.Fail(BookingActionError.SlotTaken);

        appointment.ScheduledAt = start;
        appointment.DurationMinutes = _hours.DurationMinutes;
        // Choosing a new time from the private link counts as confirming it.
        appointment.ConfirmedAt = nowUtc;
        appointment.Reminder24hSentAt = null;
        appointment.Reminder30mSentAt = null;
        appointment.UpdatedAt = nowUtc;
        await _db.SaveChangesAsync();
        return Done(appointment, nowUtc);
    }

    public async Task<List<ReminderDue>> GetDueRemindersAsync(DateTime nowUtc)
    {
        var dayAhead = nowUtc.AddHours(24);
        var halfHourAhead = nowUtc.AddMinutes(30);
        var rows = await _db.Appointments.AsNoTracking()
            .Where(a => a.ConfirmedAt != null && a.CancelledAt == null && a.Status != SchedulingRules.CancelledStatus
                && a.ScheduledAt != null && a.ScheduledAt > nowUtc && a.ScheduledAt <= dayAhead
                && a.Email != null && a.Email != ""
                && (a.Reminder24hSentAt == null || (a.Reminder30mSentAt == null && a.ScheduledAt <= halfHourAhead)))
            .Select(a => new { a.Id, a.Email, a.Prenume, a.Nume, a.ScheduledAt, a.ConfirmedAt, a.Reminder24hSentAt, a.Reminder30mSentAt })
            .ToListAsync();

        var due = new List<ReminderDue>();
        foreach (var a in rows)
        {
            var start = DateTime.SpecifyKind(a.ScheduledAt!.Value, DateTimeKind.Utc);
            var name = string.IsNullOrWhiteSpace(a.Prenume) ? a.Nume : a.Prenume;
            if (start <= halfHourAhead)
            {
                if (a.Reminder30mSentAt == null) due.Add(new ReminderDue(a.Id, ReminderKind.HalfHourBefore, a.Email, name, start));
            }
            // No "tomorrow" email for a call booked less than a day ahead: the confirmation is enough.
            else if (a.Reminder24hSentAt == null && a.ConfirmedAt!.Value < start.AddHours(-24))
            {
                due.Add(new ReminderDue(a.Id, ReminderKind.DayBefore, a.Email, name, start));
            }
        }
        return due;
    }

    public async Task MarkReminderSentAsync(int appointmentId, ReminderKind kind, DateTime nowUtc)
    {
        var appointment = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == appointmentId);
        if (appointment == null) return;
        if (kind == ReminderKind.DayBefore) appointment.Reminder24hSentAt = nowUtc;
        else appointment.Reminder30mSentAt = nowUtc;
        await _db.SaveChangesAsync();
    }

    // Public links work for any broker's appointment: the scope filter is for signed-in brokers.
    private Task<Appointment?> FindAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 100) return Task.FromResult<Appointment?>(null);
        var hash = Hash(token.Trim());
        return _db.Appointments.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.ConfirmationTokenHash == hash);
    }

    private static BookingActionError Blocked(Appointment? a, DateTime nowUtc)
    {
        if (a == null || a.ScheduledAt == null) return BookingActionError.NotFound;
        if (a.CancelledAt != null || a.Status == SchedulingRules.CancelledStatus) return BookingActionError.Cancelled;
        if (a.ScheduledAt.Value <= nowUtc) return BookingActionError.Past;
        return BookingActionError.None;
    }

    private BookingActionResult Done(Appointment a, DateTime nowUtc) =>
        new() { Booking = View(a, nowUtc), BrokerProfileId = a.BrokerProfileId };

    private BookingView View(Appointment a, DateTime nowUtc)
    {
        var start = DateTime.SpecifyKind(a.ScheduledAt ?? a.CreatedAt, DateTimeKind.Utc);
        var status = a.CancelledAt != null || a.Status == SchedulingRules.CancelledStatus ? BookingStatus.Cancelled
            : start <= nowUtc ? BookingStatus.Past
            : a.ConfirmedAt != null ? BookingStatus.Confirmed
            : BookingStatus.Pending;
        string? broker = null;
        if (a.BrokerProfileId.HasValue)
            _brokerProfiles.GetDisplayNames().TryGetValue(a.BrokerProfileId.Value, out broker);
        var firstName = string.IsNullOrWhiteSpace(a.Prenume) ? a.Nume : a.Prenume;
        return new BookingView(a.Id, firstName, start, a.DurationMinutes, status, broker);
    }

    /// <summary>
    /// Busy times for public booking: the broker's own appointments plus the ones still waiting in the
    /// Super Admin inbox (they will land on a broker's calendar), minus cancelled ones and expired holds.
    /// </summary>
    private async Task<List<(DateTime Start, DateTime End)>> BusyIntervalsAsync(int? brokerId, DateTime fromUtc, DateTime toUtc, DateTime nowUtc, int? excludeId)
    {
        var windowStart = fromUtc.AddMinutes(-SchedulingRules.MaxDuration);
        var holdCutoff = nowUtc.AddHours(-SchedulingRules.UnconfirmedHoldHours);
        var rows = await _db.Appointments.IgnoreQueryFilters().AsNoTracking()
            .Where(a => (a.BrokerProfileId == null || a.BrokerProfileId == brokerId)
                && a.ScheduledAt != null && a.ScheduledAt < toUtc && a.ScheduledAt > windowStart
                && a.Status != SchedulingRules.CancelledStatus && a.CancelledAt == null
                && !(a.Source == SchedulingRules.SiteSource && a.ConfirmedAt == null && a.CreatedAt < holdCutoff)
                && (excludeId == null || a.Id != excludeId))
            .Select(a => new { a.ScheduledAt, a.DurationMinutes })
            .ToListAsync();
        return rows
            .Select(r => (Start: DateTime.SpecifyKind(r.ScheduledAt!.Value, DateTimeKind.Utc), End: DateTime.SpecifyKind(r.ScheduledAt!.Value, DateTimeKind.Utc).AddMinutes(r.DurationMinutes)))
            .ToList();
    }

    private static bool Overlaps(List<(DateTime Start, DateTime End)> busy, DateTime start, int minutes)
    {
        var end = start.AddMinutes(minutes);
        return busy.Any(b => b.Start < end && b.End > start);
    }

    private static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };
}

/// <summary>When calls can be booked from the site (config section "Booking"), in Romanian time.</summary>
public class BookingHours
{
    public TimeZoneInfo Zone { get; init; } = TimeZoneInfo.Utc;
    public HashSet<DayOfWeek> Days { get; init; } = new();
    public TimeSpan Start { get; init; }
    public TimeSpan End { get; init; }
    public int StepMinutes { get; init; }
    public int DurationMinutes { get; init; }
    public int LeadMinutes { get; init; }
    public int DaysAhead { get; init; }
    public int DaysShown { get; init; }

    public static BookingHours From(IConfiguration configuration)
    {
        var s = configuration.GetSection("Booking");
        var days = (s["Days"] ?? "Mon,Tue,Wed,Thu,Fri")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(d => Enum.GetValues<DayOfWeek>().FirstOrDefault(x => x.ToString().StartsWith(d, StringComparison.OrdinalIgnoreCase), (DayOfWeek)(-1)))
            .Where(d => (int)d >= 0)
            .ToHashSet();
        return new BookingHours
        {
            Zone = FindZone(s["TimeZone"] ?? "Europe/Bucharest"),
            Days = days,
            Start = TimeSpan.Parse(s["Start"] ?? "09:00", CultureInfo.InvariantCulture),
            End = TimeSpan.Parse(s["End"] ?? "18:00", CultureInfo.InvariantCulture),
            StepMinutes = Math.Clamp(int.TryParse(s["StepMinutes"], out var step) ? step : 30, 5, 240),
            DurationMinutes = Math.Clamp(int.TryParse(s["DurationMinutes"], out var dur) ? dur : 15, SchedulingRules.MinDuration, SchedulingRules.MaxDuration),
            LeadMinutes = Math.Max(0, int.TryParse(s["LeadMinutes"], out var lead) ? lead : 120),
            DaysAhead = Math.Clamp(int.TryParse(s["DaysAhead"], out var ahead) ? ahead : 14, 1, 60),
            DaysShown = Math.Clamp(int.TryParse(s["DaysShown"], out var shown) ? shown : 5, 1, 30),
        };
    }

    public DateTime ToLocal(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);

    /// <summary>Every offered start time (UTC) from the earliest bookable moment up to <see cref="DaysAhead"/> days.</summary>
    public IEnumerable<DateTime> CandidateStarts(DateTime nowUtc)
    {
        var earliest = nowUtc.AddMinutes(LeadMinutes);
        var today = ToLocal(nowUtc).Date;
        for (var d = 0; d <= DaysAhead; d++)
        {
            var day = today.AddDays(d);
            if (!Days.Contains(day.DayOfWeek)) continue;
            for (var t = Start; t + TimeSpan.FromMinutes(DurationMinutes) <= End; t += TimeSpan.FromMinutes(StepMinutes))
            {
                var local = DateTime.SpecifyKind(day + t, DateTimeKind.Unspecified);
                if (Zone.IsInvalidTime(local)) continue;
                var utc = TimeZoneInfo.ConvertTimeToUtc(local, Zone);
                if (utc >= earliest) yield return utc;
            }
        }
    }

    private static TimeZoneInfo FindZone(string id)
    {
        foreach (var candidate in new[] { id, "Europe/Bucharest", "GTB Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(candidate); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.Utc;
    }
}
