using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoneyShop.ServiceAdapters.Services.Otp;
using MoneyShop.ServiceInterface.Interfaces.Audit;
using MoneyShop.ServiceInterface.Interfaces.Broker;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// Onboarding of new brokers by invitation: the Super Admin invites an email, the invitee opens the
/// private link and creates their own account. The link token travels in the URL fragment (never sent
/// to servers) and then in the X-Invite-Token request header, so it is not part of any request path or
/// query string; only its hash is stored.
/// </summary>
[ApiController]
public class BrokerInvitesController : BaseController
{
    private readonly IBrokerInviteService _invites;
    private readonly EmailService _email;
    private readonly IConfiguration _configuration;
    private readonly IAuditService _audit;
    private readonly ILogger<BrokerInvitesController> _logger;

    public BrokerInvitesController(IBrokerInviteService invites, EmailService email, IConfiguration configuration, IAuditService audit, ILogger<BrokerInvitesController> logger)
    {
        _invites = invites;
        _email = email;
        _configuration = configuration;
        _audit = audit;
        _logger = logger;
    }

    public const string TokenHeader = "X-Invite-Token";

    private string InviteToken => Request.Headers[TokenHeader].ToString().Trim();

    private int CurrentUserId =>
        int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

    // ── Super Admin ──

    [HttpGet("/api/broker-invites")]
    [Authorize(Roles = "Administrator")]
    public IActionResult List() => Ok(_invites.List(DateTime.UtcNow));

    [HttpPost("/api/broker-invites")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> Create([FromBody] BrokerInviteCreateBody body)
    {
        var result = _invites.Create(body?.Email, body?.Name, body?.Type, CurrentUserId, DateTime.UtcNow);
        if (!result.Success) return BadRequest(result.Error!);

        _audit.Log("BrokerInvite", result.Invite!.Id.ToString(), "created", null, new { result.Invite.Type });
        var sent = await SendAsync(result);
        return Ok(new { invite = result.Invite, emailSent = sent });
    }

    [HttpPost("/api/broker-invites/{id:int}/resend")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> Resend(int id)
    {
        var result = _invites.Resend(id, DateTime.UtcNow);
        if (!result.Success) return BadRequest(result.Error!);

        _audit.Log("BrokerInvite", id.ToString(), "resent");
        var sent = await SendAsync(result);
        return Ok(new { invite = result.Invite, emailSent = sent });
    }

    [HttpPost("/api/broker-invites/{id:int}/revoke")]
    [Authorize(Roles = "Administrator")]
    public IActionResult Revoke(int id)
    {
        var result = _invites.Revoke(id, DateTime.UtcNow);
        if (!result.Success) return BadRequest(result.Error!);

        _audit.Log("BrokerInvite", id.ToString(), "revoked");
        return Ok(result.Invite);
    }

    // ── Invitee (anonymous: the X-Invite-Token header is the credential) ──

    [HttpGet("/api/broker-invites/terms")]
    [AllowAnonymous]
    [EnableRateLimiting("public-booking")]
    public IActionResult Terms() => Ok(new { version = BrokerTerms.Version, title = BrokerTerms.Title, body = BrokerTerms.Body });

    [HttpGet("/api/broker-invites/current")]
    [AllowAnonymous]
    [EnableRateLimiting("public-booking")]
    public IActionResult Preview()
    {
        var result = _invites.Preview(InviteToken, DateTime.UtcNow);
        return result.Invite != null ? Ok(result.Invite) : InviteProblem(result.Error);
    }

    [HttpGet("/api/broker-invites/current/slug-available")]
    [AllowAnonymous]
    [EnableRateLimiting("public-booking")]
    public IActionResult SlugAvailable([FromQuery] string? slug)
    {
        var result = _invites.CheckSlug(InviteToken, slug, DateTime.UtcNow);
        if (result.Error != BrokerInviteError.None) return InviteProblem(result.Error);
        return Ok(new { slug = result.Slug, available = result.Available, reason = result.Reason });
    }

    [HttpPost("/api/broker-invites/accept")]
    [AllowAnonymous]
    [EnableRateLimiting("public-form")]
    public IActionResult Accept([FromBody] BrokerInviteAcceptInput input)
    {
        var result = _invites.Accept(InviteToken, input ?? new BrokerInviteAcceptInput(), HttpContext.Connection.RemoteIpAddress?.ToString(), DateTime.UtcNow);
        if (result.InviteError != BrokerInviteError.None) return InviteProblem(result.InviteError);
        if (result.Error != null) return BadRequest(result.Error);

        _audit.Log("BrokerProfile", result.BrokerProfileId!.Value.ToString(), "onboarded", null, new { result.Slug });
        return Ok(new { success = true, slug = result.Slug });
    }

    private async Task<bool> SendAsync(BrokerInviteCreateResult result)
    {
        var root = _configuration["Brokers:RootDomain"] ?? "moneyshop.ro";
        var url = $"https://{root}/broker/invitatie#t={Uri.EscapeDataString(result.Token!)}";
        var sent = await _email.SendBrokerInviteAsync(result.Invite!.Email, result.Invite.Name, url, BrokerTerms.InviteLifetimeDays);
        if (!sent) _logger.LogWarning("Broker invite {InviteId} email was not sent", result.Invite.Id);
        return sent;
    }

    private IActionResult InviteProblem(BrokerInviteError error) => error switch
    {
        BrokerInviteError.NotFound => StatusCode(404, new { code = "not_found", message = "Invitația nu există. Verifică linkul din email." }),
        BrokerInviteError.Expired => StatusCode(410, new { code = "expired", message = "Invitația a expirat. Cere o invitație nouă echipei MoneyShop." }),
        BrokerInviteError.Used => StatusCode(410, new { code = "used", message = "Invitația a fost deja folosită. Dacă ai deja cont, autentifică-te." }),
        BrokerInviteError.Revoked => StatusCode(410, new { code = "revoked", message = "Invitația a fost anulată. Cere o invitație nouă echipei MoneyShop." }),
        _ => StatusCode(404, new { code = "not_found", message = "Invitația nu există." })
    };
}

public class BrokerInviteCreateBody
{
    public string? Email { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; }
}
