using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.ServiceAdapters.Services.Scheduling.Outlook;

/// <summary>
/// The broker's own Outlook meetings, so the site does not offer a time they are already busy.
/// Read for the next weeks at once and kept for two minutes (the slots page and the booking itself
/// share one Graph call). If Outlook cannot be read, booking goes on with the CRM calendar alone.
/// </summary>
public class OutlookBusyTimes : IOutlookBusyTimes
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan FailureCacheFor = TimeSpan.FromMinutes(1);
    private const int WindowDays = 31;
    private static readonly HashSet<string> BusyStates = new(StringComparer.OrdinalIgnoreCase) { "busy", "oof", "tentative" };

    private static readonly ConcurrentDictionary<int, Entry> Cache = new();

    private readonly MoneyShopDbContext _db;
    private readonly IOutlookCalendar _outlook;
    private readonly ILogger<OutlookBusyTimes> _logger;

    public OutlookBusyTimes(MoneyShopDbContext db, IOutlookCalendar outlook, ILogger<OutlookBusyTimes> logger)
    {
        _db = db;
        _outlook = outlook;
        _logger = logger;
    }

    public async Task<List<BusyInterval>> GetAsync(int brokerProfileId, DateTime fromUtc, DateTime toUtc, DateTime nowUtc)
    {
        if (!_outlook.Enabled) return new List<BusyInterval>();

        if (!Cache.TryGetValue(brokerProfileId, out var entry) || entry.ExpiresUtc <= nowUtc || fromUtc < entry.FromUtc || toUtc > entry.ToUtc)
        {
            entry = await LoadAsync(brokerProfileId, Min(fromUtc, nowUtc), Max(toUtc, nowUtc.AddDays(WindowDays)), nowUtc);
            Cache[brokerProfileId] = entry;
        }
        return entry.Busy.Where(b => b.StartUtc < toUtc && b.EndUtc > fromUtc).ToList();
    }

    /// <summary>Forgets cached busy times (tests).</summary>
    public static void ClearCache() => Cache.Clear();

    private async Task<Entry> LoadAsync(int brokerId, DateTime fromUtc, DateTime toUtc, DateTime nowUtc)
    {
        var broker = await _db.BrokerProfiles.IgnoreQueryFilters().AsNoTracking()
            .Where(b => b.Id == brokerId && b.Status == "Active")
            .Select(b => new { b.Slug, b.NotificationEmail, b.PublicEmail })
            .FirstOrDefaultAsync();
        var mailbox = broker == null ? null : _outlook.MailboxFor(broker.Slug, broker.NotificationEmail, broker.PublicEmail);
        if (mailbox == null) return new Entry(fromUtc, toUtc, nowUtc.Add(CacheFor), new List<BusyInterval>());

        try
        {
            var busy = (await _outlook.ListAsync(mailbox, fromUtc, toUtc))
                // MoneyShop's own events are appointments, already counted from the CRM.
                .Where(i => i.AppointmentId == null && !i.IsCancelled && BusyStates.Contains(i.ShowAs) && i.EndUtc > i.StartUtc)
                .Select(i => new BusyInterval(i.StartUtc, i.EndUtc))
                .ToList();
            return new Entry(fromUtc, toUtc, nowUtc.Add(CacheFor), busy);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read Outlook busy times for broker {BrokerId}; booking uses the CRM calendar only", brokerId);
            return new Entry(fromUtc, toUtc, nowUtc.Add(FailureCacheFor), new List<BusyInterval>());
        }
    }

    private static DateTime Min(DateTime a, DateTime b) => a < b ? a : b;
    private static DateTime Max(DateTime a, DateTime b) => a > b ? a : b;

    private sealed record Entry(DateTime FromUtc, DateTime ToUtc, DateTime ExpiresUtc, List<BusyInterval> Busy);
}
