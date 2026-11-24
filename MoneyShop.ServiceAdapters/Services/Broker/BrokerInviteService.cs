using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Account;
using MoneyShop.ServiceInterface.Interfaces.Account;
using MoneyShop.ServiceInterface.Interfaces.Broker;

namespace MoneyShop.ServiceAdapters.Services.Broker;

public class BrokerInviteService : IBrokerInviteService
{
    private const int BROKER_ROLE_ID = BrokerProfileService.BROKER_ROLE_ID;
    internal const string DuplicateMessage = "Nu am putut crea contul: emailul, telefonul sau adresa sunt deja folosite. Încearcă din nou.";
    internal const string GenericFailureMessage = "Nu am putut crea contul. Încearcă din nou.";
    private const int MaxSlugLength = 30;
    private const int MaxPasswordLength = 128;
    private const int ListLimit = 200;

    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly Regex TokenPattern = new(@"^[A-Za-z0-9_-]{20,64}$", RegexOptions.Compiled);
    private static readonly Regex CuiPattern = new(@"^(RO)?[0-9]{2,10}$", RegexOptions.Compiled);

    private readonly MoneyShopDbContext _context;
    private readonly ILogger<BrokerInviteService> _logger;

    public BrokerInviteService(MoneyShopDbContext context, ILogger<BrokerInviteService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public static string NewToken() => Base64Url(RandomNumberGenerator.GetBytes(32));

    public static string HashToken(string token) => Base64Url(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public static string StatusOf(BrokerInvite invite, DateTime nowUtc)
    {
        if (invite.UsedAt != null) return BrokerInviteStatuses.Used;
        if (invite.RevokedAt != null) return BrokerInviteStatuses.Revoked;
        return invite.ExpiresAt <= nowUtc ? BrokerInviteStatuses.Expired : BrokerInviteStatuses.Pending;
    }

    public BrokerInviteCreateResult Create(string? email, string? name, string? type, int createdByUserId, DateTime nowUtc)
    {
        var normalisedEmail = (email ?? string.Empty).Trim().ToLowerInvariant();
        if (normalisedEmail.Length > 255 || !EmailPattern.IsMatch(normalisedEmail))
            return BrokerInviteCreateResult.Fail("Emailul nu este valid");

        if (!BrokerTypes.IsValid(type)) return BrokerInviteCreateResult.Fail("Tipul brokerului este invalid");

        var cleanName = BrokerProfileService.CleanText(name);
        if (cleanName != null && cleanName.Length > 150) return BrokerInviteCreateResult.Fail("Numele poate avea maxim 150 de caractere");

        var accountError = AccountExistsError(normalisedEmail);
        if (accountError != null) return BrokerInviteCreateResult.Fail(accountError);

        var pending = _context.BrokerInvites
            .Where(i => i.Email == normalisedEmail && i.UsedAt == null && i.RevokedAt == null && i.ExpiresAt > nowUtc)
            .Any();
        if (pending) return BrokerInviteCreateResult.Fail("Există deja o invitație activă pentru acest email. Folosește „Retrimite”.");

        var token = NewToken();
        var invite = new BrokerInvite
        {
            Email = normalisedEmail,
            Name = cleanName,
            Type = type!,
            TokenHash = HashToken(token),
            CreatedAt = nowUtc,
            ExpiresAt = nowUtc.AddDays(BrokerTerms.InviteLifetimeDays),
            CreatedByUserId = createdByUserId
        };
        _context.BrokerInvites.Add(invite);
        _context.SaveChanges();

        _logger.LogInformation("Broker invite {InviteId} created ({Type})", invite.Id, invite.Type);
        return BrokerInviteCreateResult.Ok(ToItem(invite, nowUtc), token);
    }

    public BrokerInviteCreateResult Resend(int id, DateTime nowUtc)
    {
        var invite = _context.BrokerInvites.FirstOrDefault(i => i.Id == id);
        if (invite == null) return BrokerInviteCreateResult.Fail("Invitația nu a fost găsită");

        var status = StatusOf(invite, nowUtc);
        if (status == BrokerInviteStatuses.Used) return BrokerInviteCreateResult.Fail("Invitația a fost deja folosită");
        if (status == BrokerInviteStatuses.Revoked) return BrokerInviteCreateResult.Fail("Invitația a fost anulată. Creează una nouă.");

        var accountError = AccountExistsError(invite.Email);
        if (accountError != null) return BrokerInviteCreateResult.Fail(accountError);

        var token = NewToken();
        invite.TokenHash = HashToken(token);
        invite.ExpiresAt = nowUtc.AddDays(BrokerTerms.InviteLifetimeDays);
        _context.SaveChanges();

        _logger.LogInformation("Broker invite {InviteId} resent", invite.Id);
        return BrokerInviteCreateResult.Ok(ToItem(invite, nowUtc), token);
    }

    public BrokerInviteActionResult Revoke(int id, DateTime nowUtc)
    {
        var invite = _context.BrokerInvites.FirstOrDefault(i => i.Id == id);
        if (invite == null) return BrokerInviteActionResult.Fail("Invitația nu a fost găsită");
        if (invite.UsedAt != null) return BrokerInviteActionResult.Fail("Invitația a fost deja folosită");

        if (invite.RevokedAt == null)
        {
            invite.RevokedAt = nowUtc;
            _context.SaveChanges();
            _logger.LogInformation("Broker invite {InviteId} revoked", invite.Id);
        }

        return BrokerInviteActionResult.Ok(ToItem(invite, nowUtc));
    }

    public List<BrokerInviteItem> List(DateTime nowUtc) =>
        _context.BrokerInvites
            .OrderByDescending(i => i.CreatedAt)
            .Take(ListLimit)
            .ToList()
            .Select(i => ToItem(i, nowUtc))
            .ToList();

    public BrokerInvitePreviewResult Preview(string token, DateTime nowUtc)
    {
        var invite = Find(token, nowUtc, out var error);
        if (invite == null) return new BrokerInvitePreviewResult { Error = error };

        return new BrokerInvitePreviewResult
        {
            Invite = new BrokerInvitePreview { Email = invite.Email, Name = invite.Name, Type = invite.Type }
        };
    }

    public BrokerSlugCheck CheckSlug(string token, string? slug, DateTime nowUtc)
    {
        var invite = Find(token, nowUtc, out var error);
        if (invite == null) return new BrokerSlugCheck { Error = error };

        var normalised = BrokerProfileService.NormaliseSlug(slug ?? string.Empty);
        var reason = SlugError(normalised);
        return new BrokerSlugCheck { Slug = normalised, Available = reason == null, Reason = reason };
    }

    public BrokerInviteAcceptResult Accept(string token, BrokerInviteAcceptInput input, string? ip, DateTime nowUtc)
    {
        var invite = Find(token, nowUtc, out var inviteError);
        if (invite == null) return BrokerInviteAcceptResult.Rejected(inviteError);

        input ??= new BrokerInviteAcceptInput();

        var nume = Clean(input.Nume);
        var prenume = Clean(input.Prenume);
        if (nume.Length < 2 || prenume.Length < 2) return BrokerInviteAcceptResult.Fail("Numele și prenumele sunt obligatorii");
        if (nume.Length > 70 || prenume.Length > 70) return BrokerInviteAcceptResult.Fail("Numele și prenumele pot avea maxim 70 de caractere");

        var phone = BrokerProfileService.NormalisePhone(input.Telefon);
        if (phone == null) return BrokerInviteAcceptResult.Fail("Telefonul nu este valid");

        var password = input.Password ?? string.Empty;
        if (password.Length < IPasswordResetService.MinPasswordLength)
            return BrokerInviteAcceptResult.Fail($"Parola trebuie să aibă cel puțin {IPasswordResetService.MinPasswordLength} caractere");
        if (password.Length > MaxPasswordLength) return BrokerInviteAcceptResult.Fail($"Parola poate avea maxim {MaxPasswordLength} de caractere");
        if (password != input.PasswordConfirm) return BrokerInviteAcceptResult.Fail("Parolele nu coincid");

        var city = BrokerProfileService.CleanText(input.Oras);
        if (city == null || city.Length < 2) return BrokerInviteAcceptResult.Fail("Orașul este obligatoriu");
        if (city.Length > 100) return BrokerInviteAcceptResult.Fail("Orașul poate avea maxim 100 de caractere");

        var county = RomanianCounties.Canonical(input.Judet);
        if (county == null) return BrokerInviteAcceptResult.Fail("Alege județul din listă");

        var slug = BrokerProfileService.NormaliseSlug(input.Slug ?? string.Empty);
        var slugError = SlugError(slug);
        if (slugError != null) return BrokerInviteAcceptResult.Fail(slugError);

        var firmaNume = BrokerProfileService.CleanText(input.FirmaNume);
        if (firmaNume != null && firmaNume.Length > 255) return BrokerInviteAcceptResult.Fail("Numele firmei poate avea maxim 255 de caractere");

        var cui = Regex.Replace(input.FirmaCui ?? string.Empty, @"\s+", string.Empty).ToUpperInvariant();
        if (cui.Length > 0 && !CuiPattern.IsMatch(cui)) return BrokerInviteAcceptResult.Fail("CUI-ul nu este valid");
        var firmaCui = cui.Length == 0 ? null : cui;

        if (!input.AcceptTerms) return BrokerInviteAcceptResult.Fail("Trebuie să accepți termenii de utilizare ai CRM-ului");
        if (input.TermsVersion != BrokerTerms.Version)
            return BrokerInviteAcceptResult.Fail("Termenii de utilizare s-au actualizat. Reîncarcă pagina și citește-i din nou.");

        var email = invite.Email;
        var accountError = AccountExistsError(email);
        if (accountError != null) return BrokerInviteAcceptResult.Fail(accountError);

        if (_context.Utilizatoris.Any(u => u.NumarTelefon == phone && u.IsDeleted != true))
            return BrokerInviteAcceptResult.Fail("Există deja un cont cu acest telefon");

        var (user, profile) = BrokerProfileService.BuildBrokerAccount(nume, prenume, email, phone, password, slug, emailVerified: true, nowUtc);
        profile.Type = invite.Type;
        profile.Oras = city;
        profile.Judet = county;
        profile.FirmaNume = firmaNume;
        profile.FirmaCui = firmaCui;
        profile.TermsVersion = BrokerTerms.Version;
        profile.TermsAcceptedAt = nowUtc;
        profile.TermsAcceptedIp = ip?.Length > 64 ? ip[..64] : ip;

        invite.UsedAt = nowUtc;
        invite.UsedByUser = user;

        _context.BrokerProfiles.Add(profile);
        try
        {
            _context.SaveChanges();
        }
        catch (DbUpdateConcurrencyException)
        {
            return BrokerInviteAcceptResult.Rejected(BrokerInviteError.Used);
        }
        catch (DbUpdateException ex)
        {
            if (IsUniqueViolation(ex))
            {
                _logger.LogWarning("Broker invite {InviteId} hit a unique constraint", invite.Id);
                return BrokerInviteAcceptResult.Fail(DuplicateMessage);
            }
            _logger.LogError("Broker invite {InviteId} could not be accepted: {ExceptionType}", invite.Id, (ex.InnerException ?? ex).GetType().Name);
            return BrokerInviteAcceptResult.Fail(GenericFailureMessage);
        }

        _logger.LogInformation("Broker invite {InviteId} accepted: broker {Slug} (profile {Id}, user {UserId})", invite.Id, slug, profile.Id, user.IdUtilizator);
        return BrokerInviteAcceptResult.Ok(slug, profile.Id);
    }

    internal static bool IsUniqueViolationNumber(int number) => number is 2601 or 2627;

    internal static bool IsUniqueViolation(Exception? ex)
    {
        for (var e = ex; e != null; e = e.InnerException)
        {
            if (e is SqlException sql && sql.Errors.Cast<SqlError>().Any(x => IsUniqueViolationNumber(x.Number))) return true;
        }
        return false;
    }

    private BrokerInvite? Find(string? token, DateTime nowUtc, out BrokerInviteError error)
    {
        error = BrokerInviteError.NotFound;
        if (string.IsNullOrEmpty(token) || !TokenPattern.IsMatch(token)) return null;

        var hash = HashToken(token);
        var invite = _context.BrokerInvites.FirstOrDefault(i => i.TokenHash == hash);
        if (invite == null) return null;

        error = StatusOf(invite, nowUtc) switch
        {
            BrokerInviteStatuses.Used => BrokerInviteError.Used,
            BrokerInviteStatuses.Revoked => BrokerInviteError.Revoked,
            BrokerInviteStatuses.Expired => BrokerInviteError.Expired,
            _ => BrokerInviteError.None
        };
        return error == BrokerInviteError.None ? invite : null;
    }

    private string? AccountExistsError(string email)
    {
        var existing = _context.Utilizatoris
            .Where(u => (u.Mail == email && u.IsDeleted != true) || u.Username == email)
            .Select(u => new { u.IdUtilizator, u.IdRol })
            .FirstOrDefault();
        if (existing == null) return null;

        var isBroker = existing.IdRol == BROKER_ROLE_ID || _context.BrokerProfiles.Any(p => p.UserId == existing.IdUtilizator);
        return isBroker ? "Există deja un cont de broker cu acest email" : "Există deja un cont cu acest email";
    }

    private string? SlugError(string slug)
    {
        var formatError = BrokerProfileService.CheckSlugFormat(slug, MaxSlugLength);
        if (formatError != null) return formatError;
        return _context.BrokerProfiles.Any(p => p.Slug == slug) ? "Această adresă este deja folosită de alt broker" : null;
    }

    private static BrokerInviteItem ToItem(BrokerInvite invite, DateTime nowUtc) => new()
    {
        Id = invite.Id,
        Email = invite.Email,
        Name = invite.Name,
        Type = invite.Type,
        Status = StatusOf(invite, nowUtc),
        CreatedAt = invite.CreatedAt,
        ExpiresAt = invite.ExpiresAt,
        UsedAt = invite.UsedAt,
        RevokedAt = invite.RevokedAt
    };

    private static string Clean(string? value) => Regex.Replace((value ?? string.Empty).Trim(), @"\s+", " ");

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
