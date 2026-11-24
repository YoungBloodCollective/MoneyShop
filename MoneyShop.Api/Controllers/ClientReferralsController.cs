using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoneyShop.ServiceInterface.Interfaces.Audit;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// Colaborează / Transferă: a broker hands a client to a colleague. The broker side is limited to the
/// signed-in broker's own referrals; the client answers on a private link whose token is in the request
/// body only (never in a URL the API sees or logs) and is stored only as a hash.
/// </summary>
[ApiController]
public class ClientReferralsController : BaseController
{
    private readonly IClientReferralService _referrals;
    private readonly ICrmService _crm;
    private readonly IAuditService _audit;

    public ClientReferralsController(IClientReferralService referrals, ICrmService crm, IAuditService audit)
    {
        _referrals = referrals;
        _crm = crm;
        _audit = audit;
    }

    [HttpGet("/api/crm/broker-directory")]
    [Authorize(Roles = "Administrator,Broker")]
    public IActionResult Directory([FromQuery] string? q, [FromQuery] string? oras, [FromQuery] string? judet) =>
        Ok(_referrals.SearchBrokers(q, oras, judet));

    [HttpPost("/api/crm/clients/{userId:int}/referrals")]
    [Authorize(Roles = "Administrator,Broker")]
    public async Task<IActionResult> Create(int userId, [FromBody] ReferralCreateInput input)
    {
        if (!_crm.IsClientVisible(userId)) return NotFound("Clientul nu există sau nu îți este atribuit.");
        var result = await _referrals.CreateAsync(userId, input ?? new ReferralCreateInput());
        switch (result.Error)
        {
            case ReferralError.None:
                _audit.Log("ClientReferral", result.Referral!.Id.ToString(), "created", null, new { result.Referral.Mode, result.Referral.ToBrokerProfileId });
                return Ok(new { referral = result.Referral, smsSent = result.SmsSent, emailSent = result.EmailSent });
            case ReferralError.NotBroker: return StatusCode(403, new { message = "Doar un broker poate trimite un client unui coleg." });
            case ReferralError.InvalidMode: return BadRequest("Alege Colaborare sau Transfer.");
            case ReferralError.NoteTooLong: return BadRequest($"Nota poate avea cel mult {MoneyShop.ServiceAdapters.Services.Crm.ClientReferralService.MaxNote} de caractere.");
            case ReferralError.TargetNotFound: return NotFound("Brokerul ales nu a fost găsit.");
            case ReferralError.SelfReferral: return BadRequest("Nu poți trimite clientul către tine.");
            case ReferralError.ClientNotVisible: return NotFound("Clientul nu există sau nu îți este atribuit.");
            case ReferralError.NoContact: return BadRequest("Clientul nu are telefon sau email la care să trimitem cererea de acord.");
            case ReferralError.Duplicate: return Conflict("Ai trimis deja acest client către acest broker.");
            default: return BadRequest("Cererea nu este validă.");
        }
    }

    [HttpGet("/api/crm/referrals")]
    [Authorize(Roles = "Administrator,Broker")]
    public IActionResult Overview() => Ok(_referrals.GetOverview());

    [HttpPost("/api/crm/referrals/{id:int}/cancel")]
    [Authorize(Roles = "Administrator,Broker")]
    public IActionResult Cancel(int id)
    {
        var result = _referrals.Cancel(id);
        if (result.NotFound) return NotFound("Trimiterea nu există.");
        if (!result.Success) return Conflict("Clientul a răspuns deja sau cererea a expirat, nu mai poate fi anulată.");
        _audit.Log("ClientReferral", id.ToString(), "cancelled");
        return Ok(new { cancelled = true });
    }

    [HttpPost("/api/referral-consent/preview")]
    [AllowAnonymous]
    [EnableRateLimiting("public-booking")]
    public IActionResult Preview([FromBody] ReferralConsentBody body)
    {
        var result = _referrals.PreviewConsent(body?.Token);
        Response.Headers.CacheControl = "no-store";
        return result.View != null ? Ok(result.View) : ConsentProblem(result.Error);
    }

    [HttpPost("/api/referral-consent/respond")]
    [AllowAnonymous]
    [EnableRateLimiting("public-form")]
    public async Task<IActionResult> Respond([FromBody] ReferralConsentBody body)
    {
        if (body?.Accept == null) return BadRequest("Alege Da sau Nu.");
        var result = await _referrals.RespondAsync(body.Token, body.Accept.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(), Request.Headers.UserAgent.FirstOrDefault());
        Response.Headers.CacheControl = "no-store";
        if (result.Error != ReferralConsentError.None) return ConsentProblem(result.Error);
        return Ok(new { accepted = result.Accepted, fromName = result.View!.FromName, toName = result.View.ToName });
    }

    private IActionResult ConsentProblem(ReferralConsentError error) => error switch
    {
        ReferralConsentError.Expired => StatusCode(410, new { code = "expired", message = "Linkul a expirat. Cere brokerului tău să-ți trimită altul." }),
        ReferralConsentError.Answered => StatusCode(410, new { code = "answered", message = "Ai răspuns deja la această cerere." }),
        ReferralConsentError.Cancelled => StatusCode(410, new { code = "cancelled", message = "Cererea a fost anulată de brokerul tău." }),
        _ => StatusCode(404, new { code = "not_found", message = "Linkul nu este valid. Verifică mesajul primit." }),
    };
}

public class ReferralConsentBody
{
    public string? Token { get; set; }
    public bool? Accept { get; set; }
}
