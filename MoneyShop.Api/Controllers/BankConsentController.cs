using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Acord;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// Bank consent links. Admin routes sit next to the acord admin; the public routes are
/// authenticated only by the unguessable token in the link the broker sends the client.
/// </summary>
[ApiController]
[Route("api")]
public class BankConsentController : BaseController
{
    private const int MaxSignatureDataUriLength = 1_500_000;

    private readonly IBankConsentService _bankConsentService;

    public BankConsentController(IBankConsentService bankConsentService)
    {
        _bankConsentService = bankConsentService;
    }

    // ── Admin ──

    [HttpGet("acord/admin/bank-consent/banks")]
    [Authorize(Roles = "Administrator,Broker")]
    public IActionResult Banks() => Ok(_bankConsentService.ListBanks());

    [HttpGet("acord/admin/{acordId:guid}/bank-consents")]
    [Authorize(Roles = "Administrator,Broker")]
    public IActionResult ListForAcord(Guid acordId) => Ok(_bankConsentService.ListForAcord(acordId));

    [HttpPost("acord/admin/{acordId:guid}/bank-consents")]
    [Authorize(Roles = "Administrator,Broker")]
    public IActionResult Create(Guid acordId, [FromBody] BankConsentCreateRequest request)
    {
        var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : (int?)null;
        var result = _bankConsentService.CreateForAcord(acordId, request.BankCode ?? string.Empty, userId);
        if (result.NotFound) return NotFound(result.Error ?? "Acordul nu a fost gasit");
        if (!result.Success) return BadRequest(result.Error ?? "Nu am putut genera linkul");

        return Ok(new { token = result.Token, brokerSlug = result.BrokerSlug, request = result.Request });
    }

    // ── Public ──

    [HttpGet("bank-consent/{token}")]
    public IActionResult Get(string token)
    {
        var view = _bankConsentService.GetByToken(token);
        return view == null ? NotFound("Linkul nu este valid") : Ok(view);
    }

    [HttpPost("bank-consent/{token}/sign")]
    public IActionResult Sign(string token, [FromBody] BankConsentSignRequest request)
    {
        if (!request.Accepted) return BadRequest("Bifeaza acordul pentru a semna");
        if (string.IsNullOrWhiteSpace(request.SignatureDataUri) || request.SignatureDataUri.Length > MaxSignatureDataUriLength)
            return BadRequest("Semnatura este obligatorie");

        byte[] signature;
        try
        {
            var payload = request.SignatureDataUri[(request.SignatureDataUri.IndexOf(',') + 1)..];
            signature = Convert.FromBase64String(new string(payload.Where(c => !char.IsWhiteSpace(c)).ToArray()));
        }
        catch (FormatException)
        {
            return BadRequest("Semnatura nu este valida");
        }

        var result = _bankConsentService.Sign(token, signature, GetClientIp(), Request.Headers.UserAgent.ToString());
        if (result.NotFound) return NotFound(result.Error ?? "Linkul nu este valid");
        if (!result.Success) return BadRequest(result.Error ?? "Nu am putut salva semnatura");

        return Ok(new { success = true });
    }

    private string? GetClientIp()
    {
        var forwarded = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}

public class BankConsentCreateRequest
{
    public string? BankCode { get; set; }
}

public class BankConsentSignRequest
{
    public string? SignatureDataUri { get; set; }
    public bool Accepted { get; set; }
}
