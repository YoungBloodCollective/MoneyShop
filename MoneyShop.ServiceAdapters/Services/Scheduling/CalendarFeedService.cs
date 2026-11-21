using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.ServiceAdapters.Services.Scheduling;

public class CalendarFeedService : ICalendarFeedService
{
    public const int PastDays = 30;
    public const int FutureDays = 90;

    private readonly MoneyShopDbContext _db;
    private readonly byte[] _key;

    public CalendarFeedService(MoneyShopDbContext db, IConfiguration configuration)
    {
        _db = db;
        // A dedicated key can be set to revoke every link at once; otherwise the JWT key signs them.
        var secret = configuration["Calendar:FeedKey"];
        if (string.IsNullOrWhiteSpace(secret)) secret = configuration["JwtSettings:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret)) throw new InvalidOperationException("Calendar feed signing key is not configured.");
        _key = Encoding.UTF8.GetBytes(secret);
    }

    public string TokenFor(int brokerProfileId)
    {
        using var hmac = new HMACSHA256(_key);
        var mac = hmac.ComputeHash(Encoding.UTF8.GetBytes($"calendar-feed:{brokerProfileId}"));
        return Convert.ToBase64String(mac, 0, 24).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    public bool IsValidToken(int brokerProfileId, string? token)
    {
        if (brokerProfileId <= 0 || string.IsNullOrWhiteSpace(token) || token.Length > 64) return false;
        var expected = Encoding.ASCII.GetBytes(TokenFor(brokerProfileId));
        var given = Encoding.ASCII.GetBytes(token.Trim());
        return CryptographicOperations.FixedTimeEquals(expected, given);
    }

    public async Task<string?> BuildFeedAsync(int brokerProfileId, DateTime nowUtc)
    {
        // No signed-in user here: the broker filter does not apply, so select the broker explicitly.
        var broker = await _db.BrokerProfiles.IgnoreQueryFilters().AsNoTracking()
            .Where(b => b.Id == brokerProfileId && b.Status == "Active")
            .Select(b => new { b.DisplayName })
            .FirstOrDefaultAsync();
        if (broker == null) return null;

        var from = nowUtc.AddDays(-PastDays);
        var to = nowUtc.AddDays(FutureDays);
        var rows = await _db.Appointments.IgnoreQueryFilters().AsNoTracking()
            .Where(a => a.BrokerProfileId == brokerProfileId
                && a.ScheduledAt != null && a.ScheduledAt >= from && a.ScheduledAt <= to
                && a.CancelledAt == null && a.Status != SchedulingRules.CancelledStatus)
            .OrderBy(a => a.ScheduledAt)
            .Select(a => new { a.Id, a.Nume, a.Prenume, a.Telefon, a.TipCredit, a.ScheduledAt, a.DurationMinutes, a.Source, a.ConfirmedAt, a.UpdatedAt })
            .ToListAsync();

        var events = rows.Select(a =>
        {
            var name = $"{a.Prenume} {a.Nume}".Trim();
            var unconfirmed = a.Source == SchedulingRules.SiteSource && a.ConfirmedAt == null;
            var description = new StringBuilder();
            if (!string.IsNullOrWhiteSpace(a.Telefon)) description.Append("Telefon: ").Append(a.Telefon.Trim()).Append('\n');
            if (!string.IsNullOrWhiteSpace(a.TipCredit)) description.Append("Credit: ").Append(a.TipCredit.Trim()).Append('\n');
            if (unconfirmed) description.Append("Clientul nu a confirmat încă din email.\n");
            description.Append("Detalii în CRM MoneyShop.");
            return new IcsEvent(
                Uid: IcsCalendar.AppointmentUid(a.Id),
                StartUtc: DateTime.SpecifyKind(a.ScheduledAt!.Value, DateTimeKind.Utc),
                DurationMinutes: a.DurationMinutes > 0 ? a.DurationMinutes : SchedulingRules.DefaultDuration,
                Summary: $"{(unconfirmed ? "[neconfirmat] " : "")}Apel: {name}",
                Description: description.ToString(),
                Sequence: IcsCalendar.SequenceFor(DateTime.SpecifyKind(a.UpdatedAt, DateTimeKind.Utc)));
        });

        return IcsCalendar.Feed($"MoneyShop – {broker.DisplayName}", events);
    }
}
