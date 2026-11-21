using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoneyShop.ServiceAdapters.Services.Otp;
using MoneyShop.ServiceInterface.Interfaces.Account;
using MoneyShop.ServiceInterface.Interfaces.Audit;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// "Am uitat parola": an email with a one-hour link, then a new password. The answer to a request is
/// the same whether or not the email has an account, so the endpoint cannot be used to find out who
/// is a client.
/// </summary>
[ApiController]
[Route("api/auth")]
[AllowAnonymous]
[EnableRateLimiting("auth")]
public class PasswordResetController : BaseController
{
    private const string SentMessage = "Dacă adresa are un cont MoneyShop, am trimis pe email un link de resetare valabil o oră.";

    private readonly IPasswordResetService _reset;
    private readonly EmailService _email;
    private readonly IConfiguration _configuration;
    private readonly IAuditService _audit;
    private readonly ILogger<PasswordResetController> _logger;

    public PasswordResetController(IPasswordResetService reset, EmailService email, IConfiguration configuration, IAuditService audit, ILogger<PasswordResetController> logger)
    {
        _reset = reset;
        _email = email;
        _configuration = configuration;
        _audit = audit;
        _logger = logger;
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Email) || request.Email.Length > 254)
            return BadRequest(new { message = "Introdu adresa de email." });

        var resetRequest = _reset.CreateRequest(request.Email, DateTime.UtcNow);
        if (resetRequest != null)
        {
            var root = _configuration["Brokers:RootDomain"] ?? "moneyshop.ro";
            var url = $"https://{root}/auth/reset-password?token={Uri.EscapeDataString(resetRequest.Token)}";
            var sent = await _email.SendPasswordResetAsync(resetRequest.Email, resetRequest.FirstName, url);
            _audit.Log("User", resetRequest.UserId.ToString(), "password_reset_requested", null, new { sent });
            if (!sent) _logger.LogWarning("Password reset email for user {UserId} was not sent", resetRequest.UserId);
        }

        return Ok(new { success = true, message = SentMessage });
    }

    /// <summary>Lets the page say "link expired" before the person types a new password.</summary>
    [HttpGet("reset-password/check")]
    public IActionResult Check([FromQuery] string token) =>
        _reset.Validate(token ?? "", DateTime.UtcNow) switch
        {
            PasswordResetError.None => Ok(new { valid = true }),
            PasswordResetError.Expired => StatusCode(410, new { code = "expired", message = "Linkul a expirat. Cere unul nou." }),
            _ => BadRequest(new { code = "invalid", message = "Linkul nu este valid sau a fost deja folosit." }),
        };

    [HttpPost("reset-password")]
    public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var result = _reset.Reset(request?.Token ?? "", request?.Password ?? "", DateTime.UtcNow);
        switch (result)
        {
            case PasswordResetError.None:
                var userId = (request!.Token ?? "").Split('.')[0];
                _audit.Log("User", userId, "password_reset_completed", null, null);
                return Ok(new { success = true, message = "Parola a fost schimbată. Te poți autentifica." });
            case PasswordResetError.Expired:
                return StatusCode(410, new { code = "expired", message = "Linkul a expirat. Cere unul nou." });
            case PasswordResetError.WeakPassword:
                return BadRequest(new { code = "weak_password", message = $"Parola trebuie să aibă cel puțin {IPasswordResetService.MinPasswordLength} caractere." });
            default:
                return BadRequest(new { code = "invalid", message = "Linkul nu este valid sau a fost deja folosit." });
        }
    }
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = "";
}

public class ResetPasswordRequest
{
    public string Token { get; set; } = "";
    public string Password { get; set; } = "";
}
