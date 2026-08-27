using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using System.Text.RegularExpressions;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// "Acord Clienti" - a public, link-based flow where a client identifies themselves,
/// uploads their ID document and signs the data-processing consent.
/// Every step after /start is authenticated by the session token in the route.
/// </summary>
[ApiController]
[Route("api/acord")]
public class AcordController : BaseController
{
    private static readonly Regex PhonePattern = new(@"^0[0-9]{9}$", RegexOptions.Compiled);
    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly string[] AllowedProofMimeTypes =
    {
        "image/jpeg", "image/png", "image/heic", "image/webp", "application/pdf"
    };

    private readonly IAcordService _acordService;
    private readonly ILogger<AcordController> _logger;

    public AcordController(IAcordService acordService, ILogger<AcordController> logger)
    {
        _acordService = acordService;
        _logger = logger;
    }

    // ── Public flow ──

    [HttpGet("consent-text")]
    public IActionResult GetConsentText()
    {
        return Ok(_acordService.GetConsentText());
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] AcordStartRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nume) || request.Nume.Trim().Length < 2)
            return BadRequest("Numele este obligatoriu");

        if (string.IsNullOrWhiteSpace(request.Prenume) || request.Prenume.Trim().Length < 2)
            return BadRequest("Prenumele este obligatoriu");

        var phone = new string((request.Telefon ?? string.Empty).Where(char.IsDigit).ToArray());
        if (phone.StartsWith("40") && phone.Length == 11) phone = "0" + phone.Substring(2);
        if (!PhonePattern.IsMatch(phone))
            return BadRequest("Numarul de telefon nu este valid");

        if (!string.IsNullOrWhiteSpace(request.Email) && !EmailPattern.IsMatch(request.Email.Trim()))
            return BadRequest("Adresa de email nu este valida");

        try
        {
            var result = await _acordService.StartAsync(new AcordStartInput
            {
                Nume = request.Nume,
                Prenume = request.Prenume,
                Telefon = phone,
                Email = request.Email,
                AgentCode = request.AgentCode,
                Ip = GetClientIp()
            });

            if (result.RateLimited)
                return StatusCode(429, new { message = "Prea multe cereri. Incearca din nou mai tarziu." });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting acord session");
            return InternalServerError("Nu s-a putut incepe sesiunea");
        }
    }

    [HttpGet("session/{token}")]
    public IActionResult GetSession(string token)
    {
        var session = _acordService.GetByToken(token);
        if (session == null) return NotFound("Sesiune invalida sau expirata");
        return Ok(session);
    }

    [HttpPost("document/{token}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> SubmitDocument(string token, [FromForm] AcordDocumentRequest request)
    {
        if (request.DocumentFront == null || request.DocumentFront.Length == 0)
            return BadRequest("Fotografia fetei documentului este obligatorie");

        try
        {
            var front = await ReadFile(request.DocumentFront);
            byte[]? back = null;
            if (request.DocumentBack != null && request.DocumentBack.Length > 0)
                back = await ReadFile(request.DocumentBack);

            var result = await _acordService.SubmitDocumentAsync(
                token,
                front, request.DocumentFront.ContentType ?? "image/jpeg",
                back, request.DocumentBack?.ContentType);

            if (!result.Accepted) return NotFound(result.Message ?? "Sesiune invalida sau expirata");

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting acord document");
            return InternalServerError("Nu s-a putut incarca documentul");
        }
    }

    [HttpPost("liveness/{token}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> SubmitLiveness(string token, [FromForm] AcordSelfieRequest request)
    {
        if (request.Selfie == null || request.Selfie.Length == 0)
            return BadRequest("Selfie-ul este obligatoriu");

        try
        {
            var selfie = await ReadFile(request.Selfie);
            var result = await _acordService.SubmitLivenessAsync(
                token, selfie, request.Selfie.ContentType ?? "image/jpeg");

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting acord liveness");
            return InternalServerError("Nu s-a putut procesa verificarea faciala");
        }
    }

    [HttpPost("address-proof/{token}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(15_000_000)]
    public async Task<IActionResult> SubmitAddressProof(string token, [FromForm] AcordAddressProofRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            return BadRequest("Fisierul este obligatoriu");

        var mimeType = request.File.ContentType ?? "application/octet-stream";
        if (!AllowedProofMimeTypes.Contains(mimeType))
            return BadRequest("Format acceptat: JPG, PNG, HEIC, WEBP sau PDF");

        try
        {
            var content = await ReadFile(request.File);
            var ok = await _acordService.SubmitProofOfAddressAsync(
                token, content, SanitiseFileName(request.File.FileName), mimeType);

            if (!ok) return NotFound("Sesiune invalida sau expirata");

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting acord address proof");
            return InternalServerError("Nu s-a putut incarca dovada de adresa");
        }
    }

    [HttpPost("sign/{token}")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> Sign(string token, [FromBody] AcordSignRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SignatureDataUri))
            return BadRequest("Semnatura este obligatorie");

        if (!request.AcceptIntermediere)
            return BadRequest("Acordul pentru prelucrarea datelor este obligatoriu");

        byte[] signature;
        try
        {
            signature = DecodeDataUri(request.SignatureDataUri);
        }
        catch
        {
            return BadRequest("Semnatura nu a putut fi procesata");
        }

        if (signature.Length == 0) return BadRequest("Semnatura este goala");

        try
        {
            var choices = new AcordSignChoices
            {
                AcceptIntermediere = request.AcceptIntermediere,
                AcceptMarketing = request.AcceptMarketing,
                WaiveOug52 = request.WaiveOug52
            };

            var result = await _acordService.SignAsync(token, signature, choices, new AcordSignContext
            {
                Ip = GetClientIp(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                SourceChannel = "web"
            });

            if (!result.Success) return BadRequest(result.Message ?? "Semnarea nu a reusit");

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error signing acord");
            return InternalServerError("Nu s-a putut salva acordul");
        }
    }

    // ── Admin ──

    [HttpGet("admin/list")]
    [Authorize(Roles = "Administrator")]
    public IActionResult AdminList([FromQuery] string? status, [FromQuery] string? search)
    {
        return Ok(_acordService.ListForAdmin(status, search));
    }

    [HttpGet("admin/{acordId}")]
    [Authorize(Roles = "Administrator")]
    public IActionResult AdminDetails(Guid acordId)
    {
        var details = _acordService.GetDetailsForAdmin(acordId);
        if (details == null) return NotFound("Acordul nu a fost gasit");
        return Ok(details);
    }

    [HttpGet("admin/file/{fileId}")]
    [Authorize(Roles = "Administrator")]
    public IActionResult AdminFile(Guid fileId)
    {
        var file = _acordService.GetFileForAdmin(fileId);
        if (file == null) return NotFound("Fisierul nu este disponibil");
        return File(file.Content, file.MimeType, file.FileName);
    }

    [HttpPost("admin/{acordId}/status")]
    [Authorize(Roles = "Administrator")]
    public IActionResult AdminUpdateStatus(Guid acordId, [FromBody] AcordStatusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
            return BadRequest("Statusul este obligatoriu");

        var ok = _acordService.UpdateStatusForAdmin(acordId, request.Status, request.ReviewNote);
        if (!ok) return NotFound("Acordul nu a fost gasit");

        return Ok(new { success = true });
    }

    // ── Helpers ──

    private string? GetClientIp()
    {
        var forwarded = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
            return forwarded.Split(',')[0].Trim();

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static async Task<byte[]> ReadFile(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        return ms.ToArray();
    }

    private static byte[] DecodeDataUri(string dataUri)
    {
        var commaIndex = dataUri.IndexOf(',');
        var payload = commaIndex >= 0 ? dataUri.Substring(commaIndex + 1) : dataUri;
        return Convert.FromBase64String(payload);
    }

    private static string SanitiseFileName(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)) return "dovada-adresa";

        var name = Path.GetFileName(fileName);
        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(name.Where(c => !invalid.Contains(c)).ToArray());

        return string.IsNullOrWhiteSpace(cleaned) ? "dovada-adresa" : cleaned;
    }
}

// ── Request models ──

public class AcordStartRequest
{
    public string Nume { get; set; } = null!;
    public string Prenume { get; set; } = null!;
    public string Telefon { get; set; } = null!;
    public string? Email { get; set; }
    public string? AgentCode { get; set; }
}

public class AcordDocumentRequest
{
    public IFormFile? DocumentFront { get; set; }
    public IFormFile? DocumentBack { get; set; }
}

public class AcordSelfieRequest
{
    public IFormFile? Selfie { get; set; }
}

public class AcordAddressProofRequest
{
    public IFormFile? File { get; set; }
}

public class AcordSignRequest
{
    public string SignatureDataUri { get; set; } = null!;
    public bool AcceptIntermediere { get; set; }
    public bool AcceptMarketing { get; set; }
    public bool WaiveOug52 { get; set; }
}

public class AcordStatusRequest
{
    public string Status { get; set; } = null!;
    public string? ReviewNote { get; set; }
}
