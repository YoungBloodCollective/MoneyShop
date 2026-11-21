namespace MoneyShop.ServiceInterface.Interfaces.Scheduling;

/// <summary>
/// Call booking from moneyshop.ro. The client sees only times that are really free in the broker's
/// calendar, books one, and gets an email with a private link to confirm, move or cancel it.
/// A booking that is not confirmed holds its slot for <see cref="SchedulingRules.UnconfirmedHoldHours"/> hours.
/// Reminders go out 24 hours and 30 minutes before a confirmed call.
/// </summary>
public interface IPublicBookingService
{
    /// <summary>Free times for the next working days, for the broker behind the slug (or the default broker).</summary>
    Task<List<BookingDay>> GetSlotsAsync(string? brokerSlug, DateTime nowUtc);

    /// <summary>True when <paramref name="startUtc"/> is one of the offered times and nothing overlaps it.</summary>
    Task<bool> IsBookableAsync(int? capacityBrokerProfileId, DateTime startUtc, DateTime nowUtc, int? excludeAppointmentId = null);

    /// <summary>New random link token; only its hash is stored.</summary>
    string NewToken(out string tokenHash);

    Task<BookingView?> GetByTokenAsync(string token, DateTime nowUtc);
    Task<BookingActionResult> ConfirmAsync(string token, DateTime nowUtc);
    Task<BookingActionResult> CancelAsync(string token, DateTime nowUtc);
    Task<BookingActionResult> RescheduleAsync(string token, DateTime newStartUtc, DateTime nowUtc);

    /// <summary>Confirmed calls that need the 24 h or the 30 min reminder now.</summary>
    Task<List<ReminderDue>> GetDueRemindersAsync(DateTime nowUtc);
    Task MarkReminderSentAsync(int appointmentId, ReminderKind kind, DateTime nowUtc);

    int SlotDurationMinutes { get; }
}

public record BookingSlot(DateTime StartUtc, string Label);
public record BookingDay(string Date, string Label, List<BookingSlot> Slots);

public static class BookingStatus
{
    public const string Pending = "pending";
    public const string Confirmed = "confirmed";
    public const string Cancelled = "cancelled";
    public const string Past = "past";
}

public record BookingView(int AppointmentId, string FirstName, DateTime ScheduledAtUtc, int DurationMinutes,
    string Status, string? BrokerName);

public enum BookingActionError { None, NotFound, Cancelled, Past, SlotTaken }

public class BookingActionResult
{
    public BookingActionError Error { get; init; }
    public BookingView? Booking { get; init; }
    /// <summary>The broker to tell about the change (null when the booking is still unassigned).</summary>
    public int? BrokerProfileId { get; init; }
    public bool Ok => Error == BookingActionError.None;

    public static BookingActionResult Fail(BookingActionError error) => new() { Error = error };
}

public enum ReminderKind { DayBefore, HalfHourBefore }

public record ReminderDue(int AppointmentId, ReminderKind Kind, string Email, string FirstName, DateTime ScheduledAtUtc);
