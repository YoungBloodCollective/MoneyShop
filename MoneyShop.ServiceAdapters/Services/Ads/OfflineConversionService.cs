using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Ads;

namespace MoneyShop.ServiceAdapters.Services.Ads;

/// <summary>
/// Leads that came from a Google Ads click and turned out to be real clients, as the CSV that Google
/// Ads fetches on a schedule (offline conversion import). A lead counts as qualified when the broker
/// moved it forward ("În lucru" / "Trimis Lead", e.g. via the call outcome "Merge mai departe") or the
/// client signed the agreement. Each click is reported once, at the time of the request, so repeated
/// fetches never double count.
/// </summary>
public class OfflineConversionService : IOfflineConversionService
{
    public const string ConversionName = "Lead calificat (CRM)";
    public const int LookbackDays = 89; // Google accepts clicks up to 90 days old
    public static readonly string[] QualifiedStatuses = { "In lucru", "Trimis Lead" };

    private readonly MoneyShopDbContext _db;

    public OfflineConversionService(MoneyShopDbContext db)
    {
        _db = db;
    }

    public async Task<List<OfflineConversion>> GetQualifiedAsync(DateTime nowUtc)
    {
        var since = nowUtc.AddDays(-LookbackDays);
        var withClick = await _db.Appointments.IgnoreQueryFilters().AsNoTracking()
            .Where(a => a.Gclid != null && a.CreatedAt >= since)
            .Select(a => new { a.Gclid, a.Status, a.Telefon, a.CreatedAt })
            .ToListAsync();
        if (withClick.Count == 0) return new List<OfflineConversion>();

        var signedPhones = (await _db.AcordClients.IgnoreQueryFilters().AsNoTracking()
                .Where(a => a.SignedAt != null && a.SignedAt >= since)
                .Select(a => a.Telefon)
                .ToListAsync())
            .Select(NormalizePhone).Where(p => p.Length >= 7).ToHashSet();

        return withClick
            .Where(a => QualifiedStatuses.Contains(a.Status) || signedPhones.Contains(NormalizePhone(a.Telefon)))
            .GroupBy(a => a.Gclid!)
            .Select(g => new OfflineConversion(g.Key, DateTime.SpecifyKind(g.Min(a => a.CreatedAt), DateTimeKind.Utc)))
            .OrderBy(c => c.AtUtc)
            .ToList();
    }

    /// <summary>
    /// Plain CSV with the header on the first line, as Google Ads Data Manager reads it (it treats a
    /// "Parameters:" line as the header); each time carries its UTC offset.
    /// Data Manager needs at least one data row to read the file's schema, so an empty list yields a
    /// single placeholder row (when <paramref name="placeholderAtUtc"/> is given) whose click ID is not
    /// a real GCLID: Google rejects it as invalid and no conversion is recorded.
    /// </summary>
    public static string ToCsv(IEnumerable<OfflineConversion> conversions, DateTime? placeholderAtUtc = null)
    {
        var rows = conversions.ToList();
        if (rows.Count == 0 && placeholderAtUtc is { } at)
            rows.Add(new OfflineConversion(PlaceholderGclid, at));

        var sb = new StringBuilder();
        sb.Append("Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency\r\n");
        foreach (var c in rows)
        {
            sb.Append(c.Gclid).Append(',')
              .Append(ConversionName).Append(',')
              .Append(c.AtUtc.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)).Append("+00:00").Append(',')
              .Append("1,RON\r\n");
        }
        return sb.ToString();
    }

    public const string PlaceholderGclid = "PLACEHOLDER-NO-CONVERSIONS";

    private static string NormalizePhone(string? phone)
    {
        var digits = new string((phone ?? "").Where(char.IsDigit).ToArray());
        if (digits.StartsWith("0040")) digits = digits[4..];
        else if (digits.StartsWith("40") && digits.Length >= 11) digits = digits[2..];
        if (digits.StartsWith('0')) digits = digits[1..];
        return digits;
    }
}
