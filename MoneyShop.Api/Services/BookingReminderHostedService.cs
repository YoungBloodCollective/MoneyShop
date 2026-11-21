using MoneyShop.ServiceAdapters.Services.Otp;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.Api.Services;

/// <summary>
/// Every few minutes, emails clients whose confirmed call is due: one reminder the day before and
/// one about 30 minutes before. Each reminder is sent once (marked on the appointment).
/// </summary>
public class BookingReminderHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BookingReminderHostedService> _logger;

    public BookingReminderHostedService(IServiceScopeFactory scopeFactory, ILogger<BookingReminderHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try { await Task.Delay(StartupDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var booking = scope.ServiceProvider.GetRequiredService<IPublicBookingService>();
                var email = scope.ServiceProvider.GetRequiredService<EmailService>();
                var now = DateTime.UtcNow;
                foreach (var due in await booking.GetDueRemindersAsync(now))
                {
                    var sent = await email.SendBookingReminderAsync(due.Email, due.FirstName, due.ScheduledAtUtc,
                        booking.SlotDurationMinutes, due.Kind == ReminderKind.HalfHourBefore);
                    // Mark it even when Brevo is not configured, so a missing key does not resend forever.
                    await booking.MarkReminderSentAsync(due.AppointmentId, due.Kind, now);
                    _logger.LogInformation("Booking reminder {Kind} for appointment {Id}: sent={Sent}", due.Kind, due.AppointmentId, sent);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Booking reminder run failed");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
