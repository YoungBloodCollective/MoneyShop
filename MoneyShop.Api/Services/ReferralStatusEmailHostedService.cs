using MoneyShop.ServiceAdapters.Services.Crm;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Services;

/// <summary>Sends the status emails the referral notifier queued, one at a time, off the request path.</summary>
public class ReferralStatusEmailHostedService : BackgroundService
{
    private readonly ReferralStatusQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReferralStatusEmailHostedService> _logger;

    public ReferralStatusEmailHostedService(ReferralStatusQueue queue, IServiceScopeFactory scopeFactory, ILogger<ReferralStatusEmailHostedService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var email in _queue.Reader.ReadAllAsync(stoppingToken))
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var messenger = scope.ServiceProvider.GetRequiredService<IReferralMessenger>();
                    await ReferralStatusQueue.DeliverAsync(messenger, email, _logger);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Referral status email worker failed on one message");
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
