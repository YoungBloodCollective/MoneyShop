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
    private const long MaxUploadBytes = 10 * 1024 * 1024;

    private static readonly string[] AllowedMimeTypes =
    {
        "image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif", "image/webp", "application/pdf"
    };

    /// <summary>
    /// Which documents each type of ID actually needs, per the operator's rules.
    /// </summary>
    private static readonly Dictionary<string, (bool back, bool proof)> TipActRules = new()
    {
        ["carte_identitate"] = (back: false, proof: false),
        ["carte_identitate_electronica"] = (back: true, proof: true),
        ["carte_identitate_simpla"] = (back: true, proof: false),
    };

    /// <summary>
    /// The options were renamed once. A phone holding the previous bundle in
    /// cache still posts the old keys, and rejecting those strands the client on
    /// an error they cannot act on, so they are accepted and translated.
    /// </summary>
    private static readonly Dictionary<string, string> LegacyTipAct = new()
    {
        ["buletin"] = "carte_identitate",
        ["buletin_electronic"] = "carte_identitate_electronica",
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

    [HttpPost("submit")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(40_000_000)]
    public async Task<IActionResult> Submit([FromForm] AcordSubmitRequest request)
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

        var tipAct = request.TipAct?.Trim() ?? string.Empty;
        if (LegacyTipAct.TryGetValue(tipAct, out var renamed)) tipAct = renamed;

        if (!TipActRules.TryGetValue(tipAct, out var rules))
            return BadRequest("Selecteaza tipul actului de identitate");

        if (!request.AcceptIntermediere)
            return BadRequest("Acordul pentru prelucrarea datelor este obligatoriu");

        var frontError = ValidateUpload(request.DocumentFront, "Poza fata a actului", required: true);
        if (frontError != null) return BadRequest(frontError);

        var backError = ValidateUpload(request.DocumentBack, "Poza spate a actului", rules.back);
        if (backError != null) return BadRequest(backError);

        var proofError = ValidateUpload(request.AddressProof, "Dovada de adresa", rules.proof);
        if (proofError != null) return BadRequest(proofError);

        if (string.IsNullOrWhiteSpace(request.SignatureDataUri))
            return BadRequest("Semnatura este obligatorie");

        byte[] signature;
        try { signature = DecodeDataUri(request.SignatureDataUri); }
        catch { return BadRequest("Semnatura nu a putut fi procesata"); }

        if (signature.Length == 0) return BadRequest("Semnatura este goala");

        try
        {
            var result = await _acordService.SubmitAsync(new AcordSubmitInput
            {
                Nume = request.Nume,
                Prenume = request.Prenume,
                Telefon = phone,
                Email = request.Email,
                TipAct = tipAct,
                AgentCode = request.AgentCode,
                Ip = GetClientIp(),
                DocumentFront = await ReadUpload(request.DocumentFront!),
                DocumentBack = request.DocumentBack is { Length: > 0 } ? await ReadUpload(request.DocumentBack) : null,
                AddressProof = request.AddressProof is { Length: > 0 } ? await ReadUpload(request.AddressProof) : null,
                SignaturePng = signature,
                Choices = new AcordSignChoices
                {
                    AcceptIntermediere = request.AcceptIntermediere,
                    AcceptMarketing = request.AcceptMarketing,
                    WaiveOug52 = request.WaiveOug52
                }
            }, new AcordSignContext
            {
                Ip = GetClientIp(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                SourceChannel = "web"
            });

            if (result.RateLimited)
                return StatusCode(429, new { message = "Prea multe cereri. Incearca din nou mai tarziu." });

            if (!result.Success)
                return BadRequest(result.Message ?? "Trimiterea nu a reusit");

            return Ok(new { success = true, acordId = result.AcordId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting acord");
            return InternalServerError("Nu am putut trimite formularul. Incearca din nou.");
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

    private static string? ValidateUpload(IFormFile? file, string label, bool required)
    {
        if (file == null || file.Length == 0)
            return required ? $"{label} este obligatorie" : null;

        if (file.Length > MaxUploadBytes)
            return $"{label}: fisierul depaseste 10MB";

        var mime = (file.ContentType ?? string.Empty).ToLowerInvariant();
        if (!AllowedMimeTypes.Contains(mime))
            return $"{label}: format acceptat PNG, JPG sau PDF";

        return null;
    }

    private static async Task<AcordUpload> ReadUpload(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);

        return new AcordUpload
        {
            Content = ms.ToArray(),
            FileName = SanitiseFileName(file.FileName),
            MimeType = file.ContentType ?? "application/octet-stream"
        };
    }

    private static byte[] DecodeDataUri(string dataUri)
    {
        var commaIndex = dataUri.IndexOf(',');
        var payload = commaIndex >= 0 ? dataUri.Substring(commaIndex + 1) : dataUri;

        // Some clients wrap or pad the value in transit; base64 itself never
        // contains whitespace, so stripping it is safe.
        payload = new string(payload.Where(c => !char.IsWhiteSpace(c)).ToArray());

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

public class AcordSubmitRequest
{
    public string Nume { get; set; } = null!;
    public string Prenume { get; set; } = null!;
    public string Telefon { get; set; } = null!;
    public string? Email { get; set; }
    public string? TipAct { get; set; }
    public string? AgentCode { get; set; }

    public IFormFile? DocumentFront { get; set; }
    public IFormFile? DocumentBack { get; set; }
    public IFormFile? AddressProof { get; set; }

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
