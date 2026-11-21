namespace MoneyShop.ServiceInterface.Interfaces.Account;

public enum PasswordResetError { None, InvalidLink, Expired, WeakPassword }

public record PasswordResetRequest(int UserId, string Email, string FirstName, string Token);

/// <summary>
/// "Forgot password": a signed link, valid one hour and usable once (it is bound to the current
/// password, so it stops working as soon as the password changes). Nothing is stored in the database.
/// </summary>
public interface IPasswordResetService
{
    public const int MinPasswordLength = 8;
    public static readonly TimeSpan LinkLifetime = TimeSpan.FromHours(1);

    /// <summary>The link for an active account with this email, or null when there is none.</summary>
    PasswordResetRequest? CreateRequest(string email, DateTime nowUtc);

    /// <summary>Checks a link without using it (to show the form or an "expired" message).</summary>
    PasswordResetError Validate(string token, DateTime nowUtc);

    /// <summary>Sets the new password; also clears a lockout from failed logins.</summary>
    PasswordResetError Reset(string token, string newPassword, DateTime nowUtc);
}
