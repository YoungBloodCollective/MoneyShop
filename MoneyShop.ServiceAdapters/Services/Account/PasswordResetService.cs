using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Account;

namespace MoneyShop.ServiceAdapters.Services.Account;

/// <summary>
/// Stateless reset links: "{userId}.{expiryUnix}.{mac}", where the HMAC covers the user, the expiry and a
/// fingerprint of the current password hash. Changing the password changes the fingerprint, so a link
/// works once; a different signing key (PasswordReset:Key) revokes every link at once.
/// </summary>
public class PasswordResetService : IPasswordResetService
{
    private readonly MoneyShopDbContext _db;
    private readonly byte[] _key;

    public PasswordResetService(MoneyShopDbContext db, IConfiguration configuration)
    {
        _db = db;
        var secret = configuration["PasswordReset:Key"];
        if (string.IsNullOrWhiteSpace(secret)) secret = configuration["JwtSettings:SecretKey"];
        if (string.IsNullOrWhiteSpace(secret)) throw new InvalidOperationException("Password reset signing key is not configured.");
        _key = Encoding.UTF8.GetBytes("password-reset:" + secret);
    }

    public PasswordResetRequest? CreateRequest(string email, DateTime nowUtc)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        var normalized = email.Trim();
        var user = _db.Utilizatoris.FirstOrDefault(u => u.Mail == normalized && u.IsDeleted != true);
        if (user == null || string.IsNullOrWhiteSpace(user.Mail)) return null;

        var expiry = new DateTimeOffset(DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc)).Add(IPasswordResetService.LinkLifetime).ToUnixTimeSeconds();
        var token = $"{user.IdUtilizator}.{expiry}.{Mac(user.IdUtilizator, expiry, user.Parola)}";
        var firstName = string.IsNullOrWhiteSpace(user.Nume) ? user.Prenume : user.Nume;
        return new PasswordResetRequest(user.IdUtilizator, user.Mail, firstName ?? "", token);
    }

    public PasswordResetError Validate(string token, DateTime nowUtc) => Check(token, nowUtc, out _);

    public PasswordResetError Reset(string token, string newPassword, DateTime nowUtc)
    {
        var error = Check(token, nowUtc, out var user);
        if (error != PasswordResetError.None) return error;
        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < IPasswordResetService.MinPasswordLength)
            return PasswordResetError.WeakPassword;

        user!.Parola = AccountService.HashPassword(newPassword);
        user.FailedLoginAttempts = 0;
        user.LockoutEndUtc = null;
        // Following the link proves the person reads this inbox.
        user.EmailVerified = true;
        _db.SaveChanges();
        return PasswordResetError.None;
    }

    private PasswordResetError Check(string token, DateTime nowUtc, out Utilizatori? user)
    {
        user = null;
        var parts = (token ?? "").Trim().Split('.');
        if (parts.Length != 3
            || !int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var userId)
            || !long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var expiry))
            return PasswordResetError.InvalidLink;

        user = _db.Utilizatoris.FirstOrDefault(u => u.IdUtilizator == userId && u.IsDeleted != true);
        if (user == null) return PasswordResetError.InvalidLink;

        var expected = Encoding.ASCII.GetBytes(Mac(userId, expiry, user.Parola));
        var given = Encoding.ASCII.GetBytes(parts[2]);
        if (!CryptographicOperations.FixedTimeEquals(expected, given)) return PasswordResetError.InvalidLink;

        if (DateTimeOffset.FromUnixTimeSeconds(expiry).UtcDateTime <= DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc))
            return PasswordResetError.Expired;
        return PasswordResetError.None;
    }

    private string Mac(int userId, long expiry, string? passwordHash)
    {
        var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(passwordHash ?? "")))[..16];
        using var hmac = new HMACSHA256(_key);
        var mac = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{userId}:{expiry}:{fingerprint}"));
        return Convert.ToBase64String(mac).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
