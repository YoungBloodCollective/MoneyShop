using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.ServiceAdapters.Services.Crm;

/// <summary>
/// Builds the client timeline from the existing tables. Queries go through the broker scope filter,
/// so a broker only sees their own appointments, agreements and files for this client.
/// </summary>
public class ClientTimelineService : IClientTimelineService
{
    private static readonly Dictionary<string, string> ApplicationStatusLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["INREGISTRAT"] = "Înregistrat",
        ["IN_ANALIZA"] = "În analiză",
        ["NEVOIE_DOCUMENTE"] = "Necesită documente",
        ["PREAPROBAT"] = "Preaprobat",
        ["OFERTA_TRANSMISA"] = "Ofertă transmisă",
        ["ACCEPTAT_CLIENT"] = "Acceptat de client",
        ["TRIMIS_LA_BANCA"] = "Trimis la bancă",
        ["APROBAT_BANCA"] = "Aprobat de bancă",
        ["DISBURSAT"] = "Disbursat",
        ["RESPINS"] = "Respins",
    };

    private readonly MoneyShopDbContext _db;

    public ClientTimelineService(MoneyShopDbContext db)
    {
        _db = db;
    }

    public async Task<List<TimelineItem>> GetAsync(int userId, int max = 100)
    {
        var items = new List<TimelineItem>();

        var user = await _db.Utilizatoris.AsNoTracking()
            .Where(u => u.IdUtilizator == userId)
            .Select(u => new { u.NumarTelefon })
            .FirstOrDefaultAsync();
        if (user == null) return items;

        // Agreements (acorduri)
        var acords = await _db.AcordClients.AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => new { a.Telefon, a.Status, a.CreatedAt, a.SignedAt })
            .ToListAsync();
        foreach (var a in acords)
        {
            items.Add(new TimelineItem(Utc(a.CreatedAt), "acord", "Acord început", null));
            if (a.SignedAt.HasValue) items.Add(new TimelineItem(Utc(a.SignedAt.Value), "acord", "Acord semnat", null));
        }

        // Appointments: matched by phone (from the account and from the agreements)
        var phones = acords.Select(a => a.Telefon).Append(user.NumarTelefon)
            .Select(NormalizePhone).Where(p => p.Length >= 7).ToHashSet();
        if (phones.Count > 0)
        {
            var appointments = await _db.Appointments.AsNoTracking()
                .Select(a => new { a.Id, a.Telefon, a.CreatedAt, a.ScheduledAt, a.Status, a.Source, a.Notes })
                .ToListAsync();
            foreach (var a in appointments.Where(a => phones.Contains(NormalizePhone(a.Telefon))))
            {
                var source = a.Source == SchedulingRules.SiteSource ? "de pe site" : "din CRM";
                var when = a.ScheduledAt.HasValue ? $"apel {RoTime(a.ScheduledAt.Value):dd.MM.yyyy HH:mm}" : "fără oră";
                items.Add(new TimelineItem(Utc(a.CreatedAt), "appointment", $"Cerere de apel {source}", $"{when} · {StatusLabel(a.Status)}"));
                foreach (var note in (a.Notes ?? "").Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    // Notes are written as "[dd.MM.yyyy HH:mm, author] text" (Romanian time).
                    var at = ParseNoteTime(note) ?? Utc(a.CreatedAt);
                    items.Add(new TimelineItem(at, "note", "Notiță la apel", note));
                }
            }
        }

        // Credit bureau reports
        var reports = await _db.BcReports.AsNoTracking()
            .Where(r => r.UserId == userId)
            .Select(r => new { r.CreatedAt, r.FicoScore })
            .ToListAsync();
        foreach (var r in reports)
            items.Add(new TimelineItem(Utc(r.CreatedAt), "bc", "Raport Biroul de Credit încărcat", r.FicoScore.HasValue ? $"Scor FICO {r.FicoScore}" : null));

        // Files (dosare) and their status changes
        var applications = await _db.Applications.AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => new { a.Id, a.CreatedAt, a.TypeCredit })
            .ToListAsync();
        var applicationIds = applications.Select(a => a.Id).ToList();
        foreach (var a in applications)
            items.Add(new TimelineItem(Utc(a.CreatedAt), "application", $"Dosar #{a.Id} deschis", a.TypeCredit));
        if (applicationIds.Count > 0)
        {
            var history = await _db.ApplicationStatusHistories.AsNoTracking()
                .Where(h => applicationIds.Contains(h.ApplicationId))
                .Select(h => new { h.ApplicationId, h.FromStatus, h.ToStatus, h.Note, h.ChangedAt })
                .ToListAsync();
            foreach (var h in history)
            {
                var title = $"Dosar #{h.ApplicationId}: {ApplicationLabel(h.FromStatus)} → {ApplicationLabel(h.ToStatus)}";
                items.Add(new TimelineItem(Utc(h.ChangedAt), "status", title, string.IsNullOrWhiteSpace(h.Note) ? null : h.Note));
            }
        }

        // Income entered from ANAF documents
        var userKey = userId.ToString();
        var incomeUpdates = await _db.AuditEvents.AsNoTracking()
            .Where(e => e.EntityType == "UserFinancialData" && e.EntityId == userKey && e.Action == "income_updated")
            .Select(e => e.OccurredAt)
            .ToListAsync();
        foreach (var at in incomeUpdates)
            items.Add(new TimelineItem(Utc(at), "income", "Venit actualizat (ANAF)", null));

        return items.OrderByDescending(i => i.AtUtc).Take(Math.Clamp(max, 1, 500)).ToList();
    }

    private static string ApplicationLabel(string? status) =>
        string.IsNullOrWhiteSpace(status) ? "—" : ApplicationStatusLabels.TryGetValue(status, out var label) ? label : status;

    private static string StatusLabel(string status) => status switch
    {
        "In lucru" => "În lucru",
        "Nu se incadreaza" => "Nu se încadrează",
        _ => status,
    };

    private static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);

    public static string NormalizePhone(string? phone)
    {
        var digits = new string((phone ?? "").Where(char.IsDigit).ToArray());
        if (digits.StartsWith("0040")) digits = digits[4..];
        else if (digits.StartsWith("40") && digits.Length >= 11) digits = digits[2..];
        if (digits.StartsWith('0')) digits = digits[1..];
        return digits;
    }

    private static readonly Lazy<TimeZoneInfo> RoZone = new(() =>
    {
        foreach (var id in new[] { "Europe/Bucharest", "GTB Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch (TimeZoneNotFoundException) { } catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.Utc;
    });

    private static DateTime RoTime(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(Utc(utc), RoZone.Value);

    public static DateTime? ParseNoteTime(string note)
    {
        if (note.Length < 17 || note[0] != '[') return null;
        if (!DateTime.TryParseExact(note.Substring(1, 16), "dd.MM.yyyy HH:mm", System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var local))
            return null;
        try
        {
            return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), RoZone.Value);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }
}
