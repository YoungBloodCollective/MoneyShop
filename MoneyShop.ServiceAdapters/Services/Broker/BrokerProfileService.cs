using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Account;
using MoneyShop.ServiceInterface.Interfaces.Broker;

namespace MoneyShop.ServiceAdapters.Services.Broker;

public class BrokerProfileService : IBrokerProfileService
{
    private const int BROKER_ROLE_ID = 3;
    private const string STATUS_ACTIVE = "Active";
    private const string STATUS_SUSPENDED = "Suspended";

    private static readonly Regex SlugPattern = new(@"^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$", RegexOptions.Compiled);
    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    private static readonly HashSet<string> ReservedSlugs = new(StringComparer.Ordinal)
    {
        "www", "api", "admin", "app", "mail", "smtp", "imap", "pop", "ftp", "cdn", "static", "assets",
        "broker", "brokers", "auth", "login", "logout", "register", "dashboard", "staging", "dev", "test",
        "moneyshop", "support", "help", "blog", "status", "acord", "docs", "m", "mobile", "ns1", "ns2",
        "webmail", "portal", "crm", "public", "media", "files", "img", "images", "email", "beta", "demo"
    };

    private readonly MoneyShopDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BrokerProfileService> _logger;

    public BrokerProfileService(MoneyShopDbContext context, IConfiguration configuration, ILogger<BrokerProfileService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    // ── Public ──

    public BrokerPublicProfile? GetPublicProfile(string slug)
    {
        var normalised = (slug ?? string.Empty).Trim().ToLowerInvariant();
        var profile = _context.BrokerProfiles
            .FirstOrDefault(p => p.Slug == normalised && p.Status == STATUS_ACTIVE);
        if (profile == null) return null;

        return new BrokerPublicProfile
        {
            Slug = profile.Slug,
            DisplayName = profile.DisplayName,
            Phone = profile.PublicPhone,
            Email = profile.PublicEmail,
            Bio = profile.Bio,
            AcordAvailable = HasLegalIdentity(profile),
            MangoAgreementEnabled = profile.MangoAgreementEnabled
        };
    }

    public int? ResolveIntakeBrokerId(string? slug)
    {
        var requested = (slug ?? string.Empty).Trim().ToLowerInvariant();
        if (requested.Length > 0)
        {
            return _context.BrokerProfiles
                .Where(p => p.Slug == requested && p.Status == STATUS_ACTIVE)
                .Select(p => (int?)p.Id)
                .FirstOrDefault();
        }

        var defaultSlug = _configuration["Brokers:DefaultSlug"];
        if (string.IsNullOrWhiteSpace(defaultSlug)) return null;

        return _context.BrokerProfiles
            .Where(p => p.Slug == defaultSlug && p.Status == STATUS_ACTIVE)
            .Select(p => (int?)p.Id)
            .FirstOrDefault();
    }

    public BrokerLegalIdentity? GetLegalIdentity(int? brokerProfileId)
    {
        if (!brokerProfileId.HasValue) return null;

        var profile = _context.BrokerProfiles.FirstOrDefault(p => p.Id == brokerProfileId.Value);
        if (profile == null || !HasLegalIdentity(profile)) return null;

        return new BrokerLegalIdentity
        {
            BrokerProfileId = profile.Id,
            Slug = profile.Slug,
            FirmaNume = profile.FirmaNume!,
            FirmaSediu = profile.FirmaSediu!,
            FirmaCui = profile.FirmaCui!,
            FirmaRegCom = profile.FirmaRegCom!,
            FirmaEuid = profile.FirmaEuid!,
            FirmaDataInfiintarii = profile.FirmaDataInfiintarii!,
            ReprezentantNume = profile.ReprezentantNume!,
            ReprezentantTelefon = profile.ReprezentantTelefon!,
            MangoAgreementEnabled = profile.MangoAgreementEnabled,
            MangoEmail = profile.MangoEmail
        };
    }

    public string? GetNotificationEmail(int? brokerProfileId)
    {
        if (!brokerProfileId.HasValue) return null;

        return _context.BrokerProfiles
            .Where(p => p.Id == brokerProfileId.Value)
            .Select(p => p.NotificationEmail ?? p.PublicEmail ?? p.User.Mail)
            .FirstOrDefault();
    }

    public Dictionary<int, string> GetDisplayNames() =>
        _context.BrokerProfiles.ToDictionary(p => p.Id, p => p.DisplayName);

    // ── Broker (self) ──

    public BrokerProfileView? GetForUser(int userId)
    {
        var profile = _context.BrokerProfiles.FirstOrDefault(p => p.UserId == userId);
        return profile == null ? null : ToView(profile);
    }

    public BrokerSaveResult UpdateOwn(int userId, BrokerSelfUpdateInput input)
    {
        var profile = _context.BrokerProfiles.FirstOrDefault(p => p.UserId == userId);
        if (profile == null) return BrokerSaveResult.Fail("Profilul de broker nu a fost gasit");

        var error = ApplySelfFields(profile, input);
        if (error != null) return BrokerSaveResult.Fail(error);

        profile.UpdatedAt = DateTime.UtcNow;
        _context.SaveChanges();
        return BrokerSaveResult.Ok(profile.Id);
    }

    // ── Super admin ──

    public List<BrokerAdminItem> ListForAdmin()
    {
        var acorduri = CountByBroker(_context.AcordClients.Select(a => a.BrokerProfileId));
        var programari = CountByBroker(_context.Appointments.Select(a => a.BrokerProfileId));
        var cereri = CountByBroker(_context.Applications.Select(a => a.BrokerProfileId));

        return _context.BrokerProfiles
            .OrderBy(p => p.DisplayName)
            .Select(p => new { Profile = p, p.User.Mail })
            .ToList()
            .Select(x => new BrokerAdminItem
            {
                Id = x.Profile.Id,
                Slug = x.Profile.Slug,
                DisplayName = x.Profile.DisplayName,
                LoginEmail = x.Mail ?? string.Empty,
                Status = x.Profile.Status,
                Plan = x.Profile.Plan,
                AcordAvailable = HasLegalIdentity(x.Profile),
                Acorduri = acorduri.GetValueOrDefault(x.Profile.Id),
                Programari = programari.GetValueOrDefault(x.Profile.Id),
                Cereri = cereri.GetValueOrDefault(x.Profile.Id),
                CreatedAt = x.Profile.CreatedAt
            })
            .ToList();
    }

    public BrokerProfileView? GetForAdmin(int id)
    {
        var profile = _context.BrokerProfiles.FirstOrDefault(p => p.Id == id);
        return profile == null ? null : ToView(profile);
    }

    public BrokerSaveResult Create(BrokerCreateInput input)
    {
        var nume = input.Nume?.Trim() ?? string.Empty;
        var prenume = input.Prenume?.Trim() ?? string.Empty;
        if (nume.Length < 2 || prenume.Length < 2) return BrokerSaveResult.Fail("Numele si prenumele sunt obligatorii");

        var email = input.LoginEmail?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!EmailPattern.IsMatch(email)) return BrokerSaveResult.Fail("Emailul de autentificare nu este valid");

        var phone = NormalisePhone(input.LoginPhone);
        if (input.LoginPhone != null && input.LoginPhone.Trim().Length > 0 && phone == null)
            return BrokerSaveResult.Fail("Telefonul nu este valid");

        if (_context.Utilizatoris.Any(u => (u.Mail == email && u.IsDeleted != true) || u.Username == email))
            return BrokerSaveResult.Fail("Exista deja un cont cu acest email");
        if (phone != null && _context.Utilizatoris.Any(u => u.NumarTelefon == phone && u.IsDeleted != true))
            return BrokerSaveResult.Fail("Exista deja un cont cu acest telefon");

        if (!string.IsNullOrEmpty(input.Password) && input.Password.Length < 8)
            return BrokerSaveResult.Fail("Parola trebuie sa aiba minim 8 caractere");

        var slug = NormaliseSlug(string.IsNullOrWhiteSpace(input.Slug) ? $"{prenume}-{nume}" : input.Slug);
        var slugError = ValidateSlug(slug, null);
        if (slugError != null) return BrokerSaveResult.Fail(slugError);

        var user = new Utilizatori
        {
            Nume = nume,
            Prenume = prenume,
            Mail = email,
            Username = email,
            NumarTelefon = phone,
            Parola = string.IsNullOrEmpty(input.Password) ? null : AccountService.HashPassword(input.Password),
            IdRol = BROKER_ROLE_ID,
            EmailVerified = false,
            PhoneVerified = false,
            IsDeleted = false
        };

        var profile = new BrokerProfile
        {
            User = user,
            Slug = slug,
            DisplayName = $"{prenume} {nume}",
            PublicEmail = email,
            PublicPhone = phone,
            Status = STATUS_ACTIVE,
            Plan = "Partener",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var error = ApplyAdminFields(profile, input, isCreate: true);
        if (error != null) return BrokerSaveResult.Fail(error);

        _context.BrokerProfiles.Add(profile);
        _context.SaveChanges();

        _logger.LogInformation("Broker {Slug} created (profile {Id}, user {UserId})", profile.Slug, profile.Id, user.IdUtilizator);
        return BrokerSaveResult.Ok(profile.Id);
    }

    public BrokerSaveResult Update(int id, BrokerAdminUpdateInput input)
    {
        var profile = _context.BrokerProfiles.FirstOrDefault(p => p.Id == id);
        if (profile == null) return BrokerSaveResult.Fail("Brokerul nu a fost gasit");

        var error = ApplyAdminFields(profile, input, isCreate: false);
        if (error != null) return BrokerSaveResult.Fail(error);

        profile.UpdatedAt = DateTime.UtcNow;
        _context.SaveChanges();
        return BrokerSaveResult.Ok(profile.Id);
    }

    public BrokerSaveResult SetPassword(int id, string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8)
            return BrokerSaveResult.Fail("Parola trebuie sa aiba minim 8 caractere");

        var profile = _context.BrokerProfiles.FirstOrDefault(p => p.Id == id);
        if (profile == null) return BrokerSaveResult.Fail("Brokerul nu a fost gasit");

        var user = _context.Utilizatoris.First(u => u.IdUtilizator == profile.UserId);
        user.Parola = AccountService.HashPassword(password);
        _context.SaveChanges();
        return BrokerSaveResult.Ok(profile.Id);
    }

    // ── Helpers ──

    private string? ApplySelfFields(BrokerProfile profile, BrokerSelfUpdateInput input)
    {
        if (input.DisplayName != null)
        {
            var name = input.DisplayName.Trim();
            if (name.Length < 2 || name.Length > 150) return "Numele afisat trebuie sa aiba intre 2 si 150 de caractere";
            profile.DisplayName = name;
        }

        if (input.PublicPhone != null)
        {
            if (input.PublicPhone.Trim().Length == 0) profile.PublicPhone = null;
            else profile.PublicPhone = NormalisePhone(input.PublicPhone) ?? (input.PublicPhone.Trim().Length <= 30 ? input.PublicPhone.Trim() : null);
            if (input.PublicPhone.Trim().Length > 0 && profile.PublicPhone == null) return "Telefonul public nu este valid";
        }

        var emailError = ApplyEmail(input.PublicEmail, v => profile.PublicEmail = v, "Emailul public nu este valid")
                         ?? ApplyEmail(input.NotificationEmail, v => profile.NotificationEmail = v, "Emailul pentru notificari nu este valid");
        if (emailError != null) return emailError;

        if (input.Bio != null)
        {
            var bio = input.Bio.Trim();
            if (bio.Length > 500) return "Descrierea poate avea maxim 500 de caractere";
            profile.Bio = bio.Length == 0 ? null : bio;
        }

        return null;
    }

    private string? ApplyAdminFields(BrokerProfile profile, BrokerAdminUpdateInput input, bool isCreate)
    {
        var selfError = ApplySelfFields(profile, input);
        if (selfError != null) return selfError;

        if (!isCreate && input.Slug != null)
        {
            var slug = NormaliseSlug(input.Slug);
            if (slug != profile.Slug)
            {
                var slugError = ValidateSlug(slug, profile.Id);
                if (slugError != null) return slugError;
                profile.Slug = slug;
            }
        }

        if (input.Status != null)
        {
            if (input.Status != STATUS_ACTIVE && input.Status != STATUS_SUSPENDED) return "Status invalid";
            profile.Status = input.Status;
        }

        if (input.Plan != null)
        {
            var plan = input.Plan.Trim();
            if (plan.Length == 0 || plan.Length > 30) return "Planul este invalid";
            profile.Plan = plan;
        }

        string? Text(string? value, int max, string label, Action<string?> set)
        {
            if (value == null) return null;
            var trimmed = value.Trim();
            if (trimmed.Length > max) return $"{label}: maxim {max} caractere";
            set(trimmed.Length == 0 ? null : trimmed);
            return null;
        }

        var error =
            Text(input.FirmaNume, 255, "Firma", v => profile.FirmaNume = v) ??
            Text(input.FirmaSediu, 500, "Sediul firmei", v => profile.FirmaSediu = v) ??
            Text(input.FirmaCui, 20, "CUI", v => profile.FirmaCui = v) ??
            Text(input.FirmaRegCom, 50, "Nr. Registrul Comertului", v => profile.FirmaRegCom = v) ??
            Text(input.FirmaEuid, 50, "EUID", v => profile.FirmaEuid = v) ??
            Text(input.FirmaDataInfiintarii, 20, "Data infiintarii", v => profile.FirmaDataInfiintarii = v) ??
            Text(input.ReprezentantNume, 150, "Reprezentant", v => profile.ReprezentantNume = v) ??
            Text(input.ReprezentantTelefon, 30, "Telefon reprezentant", v => profile.ReprezentantTelefon = v) ??
            ApplyEmail(input.MangoEmail, v => profile.MangoEmail = v, "Emailul Mango nu este valid");
        if (error != null) return error;

        if (input.MangoAgreementEnabled.HasValue) profile.MangoAgreementEnabled = input.MangoAgreementEnabled.Value;
        if (profile.MangoAgreementEnabled && string.IsNullOrWhiteSpace(profile.MangoEmail))
            return "Pentru acordul Mango Broker este nevoie de emailul Mango al reprezentantului";

        return null;
    }

    private static string? ApplyEmail(string? value, Action<string?> set, string error)
    {
        if (value == null) return null;
        var trimmed = value.Trim().ToLowerInvariant();
        if (trimmed.Length == 0) { set(null); return null; }
        if (trimmed.Length > 255 || !EmailPattern.IsMatch(trimmed)) return error;
        set(trimmed);
        return null;
    }

    private string? ValidateSlug(string slug, int? ownId)
    {
        if (!SlugPattern.IsMatch(slug))
            return "Adresa trebuie sa aiba 3-63 de caractere: litere mici, cifre si cratime (nu la inceput sau la sfarsit)";
        if (ReservedSlugs.Contains(slug))
            return "Aceasta adresa este rezervata";
        if (_context.BrokerProfiles.Any(p => p.Slug == slug && (ownId == null || p.Id != ownId)))
            return "Aceasta adresa este deja folosita de alt broker";
        return null;
    }

    public static string NormaliseSlug(string value)
    {
        var map = new Dictionary<char, char>
        {
            ['ă'] = 'a', ['â'] = 'a', ['î'] = 'i', ['ș'] = 's', ['ş'] = 's', ['ț'] = 't', ['ţ'] = 't',
        };

        var builder = new StringBuilder();
        foreach (var raw in value.Trim().ToLowerInvariant())
        {
            var c = map.TryGetValue(raw, out var mapped) ? mapped : raw;
            if (c is >= 'a' and <= 'z' or >= '0' and <= '9') builder.Append(c);
            else if (c is ' ' or '-' or '_' or '.') builder.Append('-');
        }

        return Regex.Replace(builder.ToString(), "-{2,}", "-").Trim('-');
    }

    private static string? NormalisePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("40") && digits.Length == 11) digits = "0" + digits.Substring(2);
        if (digits.StartsWith("0040") && digits.Length == 13) digits = "0" + digits.Substring(4);
        return digits.Length == 10 && digits.StartsWith("0") ? digits : null;
    }

    private static bool HasLegalIdentity(BrokerProfile p) =>
        !string.IsNullOrWhiteSpace(p.FirmaNume) && !string.IsNullOrWhiteSpace(p.FirmaSediu) &&
        !string.IsNullOrWhiteSpace(p.FirmaCui) && !string.IsNullOrWhiteSpace(p.FirmaRegCom) &&
        !string.IsNullOrWhiteSpace(p.FirmaEuid) && !string.IsNullOrWhiteSpace(p.FirmaDataInfiintarii) &&
        !string.IsNullOrWhiteSpace(p.ReprezentantNume) && !string.IsNullOrWhiteSpace(p.ReprezentantTelefon);

    private static Dictionary<int, int> CountByBroker(IQueryable<int?> brokerIds) =>
        brokerIds.Where(id => id != null)
            .GroupBy(id => id!.Value)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionary(x => x.Key, x => x.Count);

    private BrokerProfileView ToView(BrokerProfile p)
    {
        var user = _context.Utilizatoris.First(u => u.IdUtilizator == p.UserId);
        return new BrokerProfileView
        {
            Id = p.Id,
            UserId = p.UserId,
            Slug = p.Slug,
            DisplayName = p.DisplayName,
            PublicPhone = p.PublicPhone,
            PublicEmail = p.PublicEmail,
            NotificationEmail = p.NotificationEmail,
            Bio = p.Bio,
            Status = p.Status,
            Plan = p.Plan,
            LoginEmail = user.Mail ?? string.Empty,
            LoginPhone = user.NumarTelefon,
            HasPassword = !string.IsNullOrEmpty(user.Parola),
            FirmaNume = p.FirmaNume,
            FirmaSediu = p.FirmaSediu,
            FirmaCui = p.FirmaCui,
            FirmaRegCom = p.FirmaRegCom,
            FirmaEuid = p.FirmaEuid,
            FirmaDataInfiintarii = p.FirmaDataInfiintarii,
            ReprezentantNume = p.ReprezentantNume,
            ReprezentantTelefon = p.ReprezentantTelefon,
            MangoAgreementEnabled = p.MangoAgreementEnabled,
            MangoEmail = p.MangoEmail,
            AcordAvailable = HasLegalIdentity(p),
            CreatedAt = p.CreatedAt
        };
    }
}
