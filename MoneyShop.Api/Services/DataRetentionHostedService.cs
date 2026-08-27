using MoneyShop.ServiceInterface.Interfaces.Kyc;

namespace MoneyShop.Api.Services;

/// <summary>
/// Periodically erases KYC and Acord documents whose retention period has elapsed.
/// Without this, uploaded identity documents would be kept indefinitely.
/// </summary>
public class DataRetentionHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);
    private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DataRetentionHostedService> _logger;

    public DataRetentionHostedService(IServiceScopeFactory scopeFactory, ILogger<DataRetentionHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Data retention service started (interval: {Hours}h)", Interval.TotalHours);

        try
        {
            await Task.Delay(StartupDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var kycService = scope.ServiceProvider.GetRequiredService<IKycService>();

                var erased = kycService.MarkExpiredFilesForDeletion();

                if (erased > 0)
                    _logger.LogInformation("Data retention: erased {Count} expired file(s)", erased);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Data retention sweep failed");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("Data retention service stopped");
    }
}
