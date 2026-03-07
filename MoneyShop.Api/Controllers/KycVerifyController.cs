using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Kyc;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// Proxy controller for the external SRV.KYC microservice.
/// Handles the full automated KYC flow: OCR → Liveness → Active Liveness → Face Compare.
/// </summary>
[ApiController]
[Route("api/kyc-verify")]
[Authorize]
public class KycVerifyController : ControllerBase
{
    private readonly IExternalKycService _externalKyc;
    private readonly IKycSessionRepository _kycSessionRepository;
    private readonly MoneyShopDbContext _context;
    private readonly ILogger<KycVerifyController> _logger;

    public KycVerifyController(
        IExternalKycService externalKyc,
        IKycSessionRepository kycSessionRepository,
        MoneyShopDbContext context,
        ILogger<KycVerifyController> logger)
    {
        _externalKyc = externalKyc;
        _kycSessionRepository = kycSessionRepository;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Start a new KYC verification session. Creates session in SRV.KYC and links it to the user.
    /// </summary>
    [HttpPost("start")]
    public async Task<IActionResult> StartSession()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        try
        {
            // Check if user already has a pending/verified session
            var existing = _kycSessionRepository.Get()
                .Where(k => k.UserId == userId.Value && k.KycType == "USER_KYC")
                .OrderByDescending(k => k.CreatedAt)
                .FirstOrDefault();

            if (existing?.Status == "verified")
            {
                return Ok(new { status = "already_verified", kycId = existing.KycId });
            }

            // Create external KYC session
            var externalSession = await _externalKyc.CreateSessionAsync();

            // Create or update local KYC session record
            var session = existing ?? new KycSession();
            session.KycId = existing?.KycId ?? Guid.NewGuid();
            session.UserId = userId.Value;
            session.KycType = "USER_KYC";
            session.Status = "pending";
            session.CreatedAt = DateTime.UtcNow;
            session.ExpiresAt = DateTime.UtcNow.AddDays(30);
            session.ProviderTransactionId = externalSession.SessionId;
            session.Token = externalSession.Token;

            if (existing == null)
                _kycSessionRepository.Insert(session);

            _context.SaveChanges();

            return Ok(new
            {
                kycId = session.KycId,
                sessionId = externalSession.SessionId,
                token = externalSession.Token,
                status = "pending"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting KYC session");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Submit ID document images for OCR processing.
    /// </summary>
    [HttpPost("document")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> SubmitDocument([FromForm] KycDocumentUpload upload)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (upload.DocumentFront == null || upload.DocumentFront.Length == 0)
            return BadRequest(new { message = "Document front image is required" });

        try
        {
            var session = GetUserSession(userId.Value);
            if (session == null) return BadRequest(new { message = "No active KYC session. Call /start first." });

            var frontBytes = await ReadFormFile(upload.DocumentFront);
            byte[]? backBytes = null;
            if (upload.DocumentBack != null && upload.DocumentBack.Length > 0)
                backBytes = await ReadFormFile(upload.DocumentBack);

            var result = await _externalKyc.SubmitDocumentOcrAsync(
                session.ProviderTransactionId!, session.Token!, frontBytes, backBytes);

            // Store extracted data if OCR succeeded
            if (result.OcrData != null && result.Decision == "pass")
            {
                session.Cnp = result.OcrData.Cnp;
                session.Address = result.OcrData.Address;
                session.City = result.OcrData.PlaceOfBirth;
                _context.SaveChanges();
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting document");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Submit a selfie for basic liveness detection.
    /// </summary>
    [HttpPost("liveness")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> SubmitLiveness([FromForm] KycSelfieUpload upload)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (upload.Selfie == null || upload.Selfie.Length == 0)
            return BadRequest(new { message = "Selfie image is required" });

        try
        {
            var session = GetUserSession(userId.Value);
            if (session == null) return BadRequest(new { message = "No active KYC session." });

            var selfieBytes = await ReadFormFile(upload.Selfie);
            var result = await _externalKyc.SubmitLivenessAsync(
                session.ProviderTransactionId!, session.Token!, selfieBytes);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting liveness");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Submit a selfie + active liveness challenge results.
    /// </summary>
    [HttpPost("active-liveness")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> SubmitActiveLiveness([FromForm] KycActiveLivenessUpload upload)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (upload.Selfie == null || upload.Selfie.Length == 0)
            return BadRequest(new { message = "Selfie image is required" });

        try
        {
            var session = GetUserSession(userId.Value);
            if (session == null) return BadRequest(new { message = "No active KYC session." });

            var selfieBytes = await ReadFormFile(upload.Selfie);
            var result = await _externalKyc.SubmitActiveLivenessAsync(
                session.ProviderTransactionId!, session.Token!, selfieBytes, upload.ChallengesJson);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting active liveness");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Trigger face comparison — requires document photo + selfie uploads.
    /// </summary>
    [HttpPost("face-compare")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> SubmitFaceCompare([FromForm] KycFaceCompareUpload upload)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        if (upload.DocumentPhoto == null || upload.DocumentPhoto.Length == 0)
            return BadRequest(new { message = "Document photo is required" });
        if (upload.Selfie == null || upload.Selfie.Length == 0)
            return BadRequest(new { message = "Selfie is required" });

        try
        {
            var session = GetUserSession(userId.Value);
            if (session == null) return BadRequest(new { message = "No active KYC session." });

            var docBytes = await ReadFormFile(upload.DocumentPhoto);
            var selfieBytes = await ReadFormFile(upload.Selfie);

            var result = await _externalKyc.SubmitFaceCompareAsync(
                session.ProviderTransactionId!, session.Token!, docBytes, selfieBytes);

            // After face compare, get the final decision
            var decision = await _externalKyc.GetDecisionAsync(session.ProviderTransactionId!);

            // Update local session based on decision
            if (decision.Code == 9001) // approved
            {
                session.Status = "verified";
                session.VerifiedAt = DateTime.UtcNow;

                // Store extracted person data
                if (decision.Person != null)
                {
                    session.Cnp = decision.Person.IdNumber;
                    session.City = decision.Person.PlaceOfBirth;
                    if (decision.Person.Addresses?.Count > 0)
                        session.Address = decision.Person.Addresses[0].FullAddress;
                }
            }
            else if (decision.Code == 9102) // declined
            {
                session.Status = "rejected";
                session.RejectionReason = decision.Reason ?? "Verificarea a esuat";
            }

            _context.SaveChanges();

            return Ok(new
            {
                faceCompare = result,
                decision = new
                {
                    decision.Code,
                    decision.Status,
                    decision.Reason,
                    decision.Person,
                    decision.Document
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in face compare / decision");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get current KYC status for the authenticated user.
    /// </summary>
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        var session = _kycSessionRepository.Get()
            .Where(k => k.UserId == userId.Value && k.KycType == "USER_KYC")
            .OrderByDescending(k => k.CreatedAt)
            .FirstOrDefault();

        if (session == null)
            return NotFound(new { message = "No KYC session found" });

        return Ok(new
        {
            kycId = session.KycId,
            status = session.Status,
            createdAt = session.CreatedAt,
            verifiedAt = session.VerifiedAt,
            rejectionReason = session.RejectionReason,
            externalSessionId = session.ProviderTransactionId
        });
    }

    // ── Helpers ──

    private KycSession? GetUserSession(int userId)
    {
        return _kycSessionRepository.Get()
            .Where(k => k.UserId == userId && k.KycType == "USER_KYC" && k.Status == "pending")
            .OrderByDescending(k => k.CreatedAt)
            .FirstOrDefault();
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst("Id")?.Value
                 ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    private static async Task<byte[]> ReadFormFile(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        return ms.ToArray();
    }
}

// ── Request Models ──

public class KycDocumentUpload
{
    public IFormFile DocumentFront { get; set; } = null!;
    public IFormFile? DocumentBack { get; set; }
}

public class KycSelfieUpload
{
    public IFormFile Selfie { get; set; } = null!;
}

public class KycActiveLivenessUpload
{
    public IFormFile Selfie { get; set; } = null!;
    public string? ChallengesJson { get; set; }
}

public class KycFaceCompareUpload
{
    public IFormFile DocumentPhoto { get; set; } = null!;
    public IFormFile Selfie { get; set; } = null!;
}
