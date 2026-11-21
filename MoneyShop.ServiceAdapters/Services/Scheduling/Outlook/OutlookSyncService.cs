using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.ServiceAdapters.Services.Scheduling.Outlook;

/// <summary>
/// Reconciles each broker's appointments with their Outlook calendar: what should be there is computed
/// from the CRM, compared with the events MoneyShop wrote earlier (found by their appointment id), and
/// the differences are created, updated or deleted. Running it again changes nothing, so every path that
/// touches an appointment (CRM, public link, assignment) is covered without hooks, and a failed run is
/// simply repaired by the next one. Events the broker created in Outlook are never touched.
/// </summary>
public class OutlookSyncService : IOutlookSyncService
{
    public const int PastDays = 1;
    public const int FutureDays = 60;

    private readonly MoneyShopDbContext _db;
    private readonly IOutlookCalendar _outlook;
    private readonly ILogger<OutlookSyncService> _logger;
    private readonly string _crmUrl;

    public OutlookSyncService(MoneyShopDbContext db, IOutlookCalendar outlook, IConfiguration configuration, ILogger<OutlookSyncService> logger)
    {
        _db = db;
        _outlook = outlook;
        _logger = logger;
        _crmUrl = $"https://{configuration["Brokers:RootDomain"] ?? "moneyshop.ro"}/crm/programari";
    }

    public async Task<OutlookSyncReport> SyncAllAsync(DateTime nowUtc, CancellationToken ct = default)
    {
        if (!_outlook.Enabled) return new OutlookSyncReport(0, 0, 0, 0, 0);

        var brokers = await _db.BrokerProfiles.IgnoreQueryFilters().AsNoTracking()
            .Where(b => b.Status == "Active")
            .Select(b => new { b.Id, b.Slug, b.NotificationEmail, b.PublicEmail })
            .ToListAsync(ct);

        int mailboxes = 0, created = 0, updated = 0, deleted = 0, failed = 0;
        foreach (var broker in brokers)
        {
            var mailbox = _outlook.MailboxFor(broker.Slug, broker.NotificationEmail, broker.PublicEmail);
            if (mailbox == null) continue;
            mailboxes++;
            try
            {
                var (c, u, d) = await SyncBrokerAsync(broker.Id, mailbox, nowUtc, ct);
                created += c; updated += u; deleted += d;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                failed++;
                _logger.LogWarning(ex, "Outlook sync failed for broker {BrokerId}", broker.Id);
            }
        }
        return new OutlookSyncReport(mailboxes, created, updated, deleted, failed);
    }

    private async Task<(int Created, int Updated, int Deleted)> SyncBrokerAsync(int brokerId, string mailbox, DateTime nowUtc, CancellationToken ct)
    {
        var from = nowUtc.AddDays(-PastDays);
        var to = nowUtc.AddDays(FutureDays);
        var desired = (await DesiredAsync(brokerId, from, to, nowUtc, ct)).ToDictionary(e => e.AppointmentId);

        var existing = (await _outlook.ListAsync(mailbox, from, to, ct))
            .Where(i => i.AppointmentId != null)
            .GroupBy(i => i.AppointmentId!.Value)
            .ToList();

        int created = 0, updated = 0, deleted = 0;
        foreach (var group in existing)
        {
            var events = group.ToList();
            if (!desired.TryGetValue(group.Key, out var want))
            {
                foreach (var e in events) { await _outlook.DeleteAsync(mailbox, e.EventId, ct); deleted++; }
                continue;
            }
            // Keep one copy; a duplicate (e.g. from an interrupted run) is removed.
            foreach (var extra in events.Skip(1)) { await _outlook.DeleteAsync(mailbox, extra.EventId, ct); deleted++; }
            // A time changed in Outlook by hand is put back: the CRM decides when the call is.
            var current = events[0];
            if (current.Version != want.Version || current.StartUtc != want.StartUtc || current.EndUtc != want.EndUtc) { await _outlook.UpdateAsync(mailbox, events[0].EventId, want, ct); updated++; }
            desired.Remove(group.Key);
        }
        foreach (var want in desired.Values) { await _outlook.CreateAsync(mailbox, want, ct); created++; }

        if (created + updated + deleted > 0)
            _logger.LogInformation("Outlook sync broker {BrokerId}: +{Created} ~{Updated} -{Deleted}", brokerId, created, updated, deleted);
        return (created, updated, deleted);
    }

    /// <summary>The broker's live appointments in the window, as they should look in Outlook.</summary>
    public async Task<List<OutlookEvent>> DesiredAsync(int brokerId, DateTime fromUtc, DateTime toUtc, DateTime nowUtc, CancellationToken ct = default)
    {
        var holdCutoff = nowUtc.AddHours(-SchedulingRules.UnconfirmedHoldHours);
        var rows = await _db.Appointments.IgnoreQueryFilters().AsNoTracking()
            .Where(a => a.BrokerProfileId == brokerId
                && a.ScheduledAt != null && a.ScheduledAt >= fromUtc && a.ScheduledAt <= toUtc
                && a.CancelledAt == null && a.Status != SchedulingRules.CancelledStatus
                // A site booking nobody confirmed in time no longer holds the slot.
                && !(a.Source == SchedulingRules.SiteSource && a.ConfirmedAt == null && a.CreatedAt < holdCutoff))
            .Select(a => new { a.Id, a.Nume, a.Prenume, a.Telefon, a.TipCredit, a.ScheduledAt, a.DurationMinutes, a.Source, a.ConfirmedAt })
            .ToListAsync(ct);

        return rows.Select(a =>
        {
            var start = DateTime.SpecifyKind(a.ScheduledAt!.Value, DateTimeKind.Utc);
            var duration = a.DurationMinutes > 0 ? a.DurationMinutes : SchedulingRules.DefaultDuration;
            var unconfirmed = a.Source == SchedulingRules.SiteSource && a.ConfirmedAt == null;
            var subject = $"{(unconfirmed ? "[neconfirmat] " : "")}Apel MoneyShop: {$"{a.Prenume} {a.Nume}".Trim()}";
            var body = new StringBuilder();
            if (!string.IsNullOrWhiteSpace(a.Telefon)) body.Append("Telefon: ").Append(a.Telefon.Trim()).Append('\n');
            if (!string.IsNullOrWhiteSpace(a.TipCredit)) body.Append("Credit: ").Append(a.TipCredit.Trim()).Append('\n');
            if (unconfirmed) body.Append("Clientul nu a confirmat încă din email.\n");
            body.Append("Detalii și modificări în CRM: ").Append(_crmUrl).Append('\n');
            body.Append("Mută sau anulează programarea din CRM, nu din Outlook (altfel revine la ora din CRM).");
            var end = start.AddMinutes(duration);
            var text = body.ToString();
            return new OutlookEvent(a.Id, start, end, subject, text, VersionOf(subject, start, end, text));
        }).ToList();
    }

    public static string VersionOf(string subject, DateTime start, DateTime end, string body)
    {
        var raw = $"{subject}|{start:O}|{end:O}|{body}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)))[..16];
    }
}
