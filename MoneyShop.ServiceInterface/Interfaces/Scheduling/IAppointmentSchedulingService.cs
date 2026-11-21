namespace MoneyShop.ServiceInterface.Interfaces.Scheduling;

/// <summary>
/// Appointments with a start time and duration. One broker cannot have two overlapping
/// appointments (cancelled ones do not count). The same appointment row is shown in the broker
/// CRM and in Super Admin — it is never copied between calendars.
/// </summary>
public interface IAppointmentSchedulingService
{
    Task<ScheduleOutcome> CreateManualAsync(ManualAppointmentInput input, int? ownerBrokerProfileId, int? actorUserId);
    Task<ScheduleOutcome> RescheduleAsync(int appointmentId, DateTime scheduledAtUtc, int durationMinutes);
    Task<SlotConflict?> FindConflictAsync(int? brokerProfileId, DateTime startUtc, int durationMinutes, int? excludeAppointmentId = null);
}

public static class SchedulingRules
{
    public const int MinDuration = 5;
    public const int MaxDuration = 240;
    public const int DefaultDuration = 15;
    public const string CancelledStatus = "Anulat";
}

public class ManualAppointmentInput
{
    public string Nume { get; set; } = "";
    public string? Prenume { get; set; }
    public string Telefon { get; set; } = "";
    public string? Email { get; set; }
    public string? TipCredit { get; set; }
    public string? Judet { get; set; }
    public string? Notes { get; set; }
    public DateTime ScheduledAt { get; set; }
    public int DurationMinutes { get; set; } = SchedulingRules.DefaultDuration;
    /// <summary>Super Admin only: the broker the appointment is for (ignored for brokers).</summary>
    public int? BrokerProfileId { get; set; }
}

public enum ScheduleError { None, MissingName, MissingPhone, InvalidDuration, InvalidTime, NotFound, Conflict }

public record SlotConflict(int AppointmentId, string ClientName, DateTime StartUtc, int DurationMinutes);

public class ScheduleOutcome
{
    public ScheduleError Error { get; init; }
    public SlotConflict? Conflict { get; init; }
    public int? AppointmentId { get; init; }
    public bool Ok => Error == ScheduleError.None;

    public static ScheduleOutcome Fail(ScheduleError error, SlotConflict? conflict = null) => new() { Error = error, Conflict = conflict };
}
