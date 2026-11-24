using System;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    public sealed record ReferralStatusEmail(string To, string ClientName, string BankName, string StatusLabel);

    /// <summary>
    /// Status emails wait here, fully captured, until a background worker sends them, so a slow mail
    /// provider never holds a request. Registered as a singleton; it deliberately has no matching interface.
    /// </summary>
    public sealed class ReferralStatusQueue
    {
        private readonly Channel<ReferralStatusEmail> _channel = Channel.CreateBounded<ReferralStatusEmail>(
            new BoundedChannelOptions(500) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });

        public ChannelReader<ReferralStatusEmail> Reader => _channel.Reader;

        public bool TryEnqueue(ReferralStatusEmail email) => _channel.Writer.TryWrite(email);

        public void Complete() => _channel.Writer.TryComplete();

        public static async Task DeliverAsync(IReferralMessenger messenger, ReferralStatusEmail email, ILogger logger)
        {
            try
            {
                await messenger.NotifyStatusAsync(email.To, email.ClientName, email.BankName, email.StatusLabel);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Referral status email could not be sent");
            }
        }
    }
}
