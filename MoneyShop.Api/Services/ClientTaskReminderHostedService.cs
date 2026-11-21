using MoneyShop.ServiceAdapters.Services.Otp;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Services;

/// <summary>
/// Every few minutes, emails the broker about tasks they set on a client whose time has come.
/// Each task is reminded once. A task that was already overdue by more than a few hours when it
/// was picked up (e.g. created in the past) is only marked, not emailed.
/// </summary>
public class ClientTaskReminderHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan TooLate = TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ClientTaskReminderHostedService> _logger;

    public ClientTaskReminderHostedService(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<ClientTaskReminderHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try { await Task.Delay(StartupDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        var root = _configuration["Brokers:RootDomain"] ?? "moneyshop.ro";
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var work = scope.ServiceProvider.GetRequiredService<ICrmWorkService>();
                var brokers = scope.ServiceProvider.GetRequiredService<IBrokerProfileService>();
                var email = scope.ServiceProvider.GetRequiredService<EmailService>();
                var now = DateTime.UtcNow;
                foreach (var due in work.GetDueReminders(now))
                {
                    var to = brokers.GetNotificationEmail(due.BrokerProfileId);
                    var sent = false;
                    if (!string.IsNullOrWhiteSpace(to) && now - due.DueAt <= TooLate)
                    {
                        sent = await email.SendTaskReminderAsync(to, due.ClientName, due.ClientPhone, due.Title, due.DueAt,
                            $"https://{root}/crm/clienti/{due.UserId}");
                    }
                    // Mark it even when sending failed, so a broken provider does not resend forever.
                    work.MarkReminderSent(due.TaskId, now);
                    _logger.LogInformation("Task reminder for task {Id}: sent={Sent}", due.TaskId, sent);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Task reminder run failed");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
