using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Lead;

namespace MoneyShop.ServiceAdapters.Services.Lead;

public class LeadService : ILeadService
{
    private const string KeyPurpose = "acord-lead-link-v1";
    private static readonly TimeSpan LinkValidity = TimeSpan.FromDays(14);

    private readonly MoneyShopDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<LeadService> _logger;
    private readonly TimeProvider _time;

    public LeadService(MoneyShopDbContext context, IConfiguration configuration, ILogger<LeadService> logger, TimeProvider? time = null)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
        _time = time ?? TimeProvider.System;
    }

    public async Task<LeadFromAppointmentResult> CreateFromAppointmentAsync(Appointment appointment)
    {
        var phone = NormalizePhone(appointment.Telefon);
        if (phone.Length > 0)
        {
            var sameBroker = await _context.LeadCaptures.IgnoreQueryFilters()
                .Where(l => l.BrokerProfileId == appointment.BrokerProfileId)
                .Select(l => new { l.Id, l.Telefon })
                .ToListAsync();
            var match = sameBroker.FirstOrDefault(l => NormalizePhone(l.Telefon) == phone);
            if (match != null)
            {
                var existing = await _context.LeadCaptures.IgnoreQueryFilters().FirstAsync(l => l.Id == match.Id);
                return new LeadFromAppointmentResult { Lead = existing, Created = false };
            }
        }

        var hasIntarzieri = !string.IsNullOrWhiteSpace(appointment.IntarzieriBirou)
            && !appointment.IntarzieriBirou.Equals("NU", StringComparison.OrdinalIgnoreCase);
        int? intarzieriZileMax = appointment.IntarzieriBirou switch
        {
            "Da-30 zile" => 30,
            "Da-60 zile" => 60,
            "Da-Peste 90 zile" => 90,
            _ => (int?)null,
        };
        var hasPopriri = !string.IsNullOrWhiteSpace(appointment.PopriRecuperare)
            && appointment.PopriRecuperare.Equals("DA", StringComparison.OrdinalIgnoreCase);

        var now = _time.GetUtcNow().UtcDateTime;
        var lead = new LeadCapture
        {
            BrokerProfileId = appointment.BrokerProfileId,
            NumePrenume = $"{appointment.Nume} {appointment.Prenume}".Trim(),
            Telefon = appointment.Telefon,
            Email = appointment.Email,
            Oras = appointment.Judet,
            VenitNetLunar = appointment.SalariuNet,
            CrediteActive = false,
            Intarzieri = hasIntarzieri,
            IntarzieriZileMax = intarzieriZileMax,
            PoprireSauExecutorUltimii5Ani = hasPopriri,
            Source = "appointment",
            CreatedAt = now,
            UpdatedAt = now,
        };
        _context.LeadCaptures.Add(lead);
        await _context.SaveChangesAsync();
        return new LeadFromAppointmentResult { Lead = lead, Created = true };
    }

    public async Task<LeadAcordLink?> IssueAcordLinkAsync(int leadId)
    {
        var lead = await _context.LeadCaptures.FirstOrDefaultAsync(l => l.Id == leadId);
        if (lead == null) return null;

        var now = _time.GetUtcNow().UtcDateTime;
        if (lead.Status == LeadStatuses.New)
        {
            lead.Status = LeadStatuses.Contacted;
            lead.ContactedAt ??= now;
            lead.UpdatedAt = now;
            await _context.SaveChangesAsync();
        }

        string? slug = null;
        if (lead.BrokerProfileId.HasValue)
            slug = await _context.BrokerProfiles.Where(b => b.Id == lead.BrokerProfileId.Value).Select(b => b.Slug).FirstOrDefaultAsync();

        var expiresAt = now.Add(LinkValidity);
        return new LeadAcordLink { Token = BuildToken(leadId, expiresAt), ExpiresAt = expiresAt, BrokerSlug = slug };
    }

    public async Task<LeadAcordPrefill?> GetAcordPrefillAsync(string? token)
    {
        var leadId = ReadToken(token);
        if (leadId == null) return null;
        var lead = await _context.LeadCaptures.IgnoreQueryFilters().FirstOrDefaultAsync(l => l.Id == leadId.Value);
        if (lead == null || (lead.Status == LeadStatuses.Converted && lead.UserId != null)) return null;

        var named = lead.Source is "appointment" or "colaborare" or "transfer";
        var parts = (lead.NumePrenume ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (!named) parts = Array.Empty<string>();
        return new LeadAcordPrefill
        {
            Nume = parts.Length > 0 ? parts[0] : "",
            Prenume = parts.Length > 1 ? string.Join(' ', parts.Skip(1)) : "",
            Telefon = lead.Telefon?.Trim() ?? "",
            Email = lead.Email?.Trim() ?? "",
        };
    }

    public async Task<bool> LinkAcordAsync(string? token, Guid acordId)
    {
        var leadId = ReadToken(token);
        if (leadId == null) return false;

        var acord = await _context.AcordClients.IgnoreQueryFilters()
            .Where(a => a.AcordId == acordId)
            .Select(a => new { a.UserId, a.BrokerProfileId, a.Telefon })
            .FirstOrDefaultAsync();
        if (acord == null) return false;

        var lead = await _context.LeadCaptures.IgnoreQueryFilters().FirstOrDefaultAsync(l => l.Id == leadId.Value);
        if (lead == null) return false;

        if (lead.BrokerProfileId != null && lead.BrokerProfileId != acord.BrokerProfileId) return false;
        var leadPhone = NormalizePhone(lead.Telefon);
        if (leadPhone.Length == 0 || leadPhone != NormalizePhone(acord.Telefon)) return false;
        if (lead.UserId != null && lead.UserId != acord.UserId) return false;

        var now = _time.GetUtcNow().UtcDateTime;
        lead.UserId ??= acord.UserId;
        lead.Status = LeadStatuses.Converted;
        lead.ContactedAt ??= now;
        lead.UpdatedAt = now;
        await _context.SaveChangesAsync();
        _logger.LogInformation("Lead {LeadId} converted through acord {AcordId}", lead.Id, acordId);
        return true;
    }

    private byte[] Key()
    {
        var secret = _configuration["JwtSettings:SecretKey"];
        if (string.IsNullOrEmpty(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
            throw new InvalidOperationException("JwtSettings:SecretKey is missing or shorter than 32 bytes");
        return HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(KeyPurpose));
    }

    private string BuildToken(int leadId, DateTime expiresAtUtc)
    {
        var payload = Encoding.UTF8.GetBytes($"{leadId}.{new DateTimeOffset(expiresAtUtc, TimeSpan.Zero).ToUnixTimeSeconds()}");
        var mac = HMACSHA256.HashData(Key(), payload);
        return $"{Base64Url(payload)}.{Base64Url(mac)}";
    }

    private int? ReadToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 200) return null;
        var parts = token.Split('.');
        if (parts.Length != 2) return null;
        try
        {
            var payload = FromBase64Url(parts[0]);
            var mac = FromBase64Url(parts[1]);
            if (!CryptographicOperations.FixedTimeEquals(HMACSHA256.HashData(Key(), payload), mac)) return null;
            var fields = Encoding.UTF8.GetString(payload).Split('.');
            if (fields.Length != 2 || !int.TryParse(fields[0], out var leadId) || !long.TryParse(fields[1], out var expiry)) return null;
            return _time.GetUtcNow().ToUnixTimeSeconds() < expiry ? leadId : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }

    private static string Base64Url(byte[] data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Convert.FromBase64String(padded);
    }

    internal static string NormalizePhone(string? phone)
    {
        var digits = new string((phone ?? "").Where(char.IsDigit).ToArray());
        if (digits.StartsWith("0040") && digits.Length >= 13) digits = digits.Substring(4);
        else if (digits.StartsWith("40") && digits.Length >= 11) digits = digits.Substring(2);
        if (digits.StartsWith("0")) digits = digits.Substring(1);
        return digits;
    }
}
