using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.Api.Services;

/// <summary>
/// Every two minutes, brings each broker's Outlook calendar in step with their CRM appointments
/// (Etapa 4B). Does nothing until Microsoft Graph is configured (Graph:TenantId/ClientId/ClientSecret).
/// </summary>
public class OutlookSyncHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan StartupDelay = TimeSpan.FromSeconds(90);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOutlookCalendar _outlook;
    private readonly ILogger<OutlookSyncHostedService> _logger;

    public OutlookSyncHostedService(IServiceScopeFactory scopeFactory, IOutlookCalendar outlook, ILogger<OutlookSyncHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _outlook = outlook;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_outlook.Enabled)
        {
            _logger.LogInformation("Outlook sync is off (Microsoft Graph not configured)");
            return;
        }

        try { await Task.Delay(StartupDelay, stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var sync = scope.ServiceProvider.GetRequiredService<IOutlookSyncService>();
                var report = await sync.SyncAllAsync(DateTime.UtcNow, stoppingToken);
                if (report.Failed > 0)
                    _logger.LogWarning("Outlook sync: {Failed} of {Mailboxes} calendars failed", report.Failed, report.Mailboxes);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Outlook sync run failed");
            }

            try { await Task.Delay(Interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }
}
