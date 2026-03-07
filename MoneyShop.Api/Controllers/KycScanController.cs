using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Kyc;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// Public KYC endpoints for QR-code-based mobile browser verification.
/// Token-based authentication (no JWT required) — the KYC session token acts as the credential.
/// </summary>
[ApiController]
[Route("api/kyc-scan")]
public class KycScanController : ControllerBase
{
    private readonly IExternalKycService _externalKyc;
    private readonly IKycSessionRepository _kycSessionRepository;
    private readonly MoneyShopDbContext _context;
    private readonly ILogger<KycScanController> _logger;

    public KycScanController(
        IExternalKycService externalKyc,
        IKycSessionRepository kycSessionRepository,
        MoneyShopDbContext context,
        ILogger<KycScanController> logger)
    {
        _externalKyc = externalKyc;
        _kycSessionRepository = kycSessionRepository;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Start a new KYC scan session (requires JWT auth).
    /// Returns an access token that can be embedded in a QR code URL.
    /// </summary>
    [HttpPost("start")]
    [Authorize]
    public async Task<IActionResult> StartSession()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var existing = _kycSessionRepository.Get()
                .Where(k => k.UserId == userId.Value && k.KycType == "USER_KYC")
                .OrderByDescending(k => k.CreatedAt)
                .FirstOrDefault();

            if (existing?.Status == "verified")
                return Ok(new { status = "already_verified", kycId = existing.KycId, accessToken = existing.Token });

            // Create external KYC session
            var externalSession = await _externalKyc.CreateSessionAsync();

            // Generate a secure access token for QR-based access
            var accessToken = Guid.NewGuid().ToString("N");

            var session = existing ?? new KycSession();
            session.KycId = existing?.KycId ?? Guid.NewGuid();
            session.UserId = userId.Value;
            session.KycType = "USER_KYC";
            session.Status = "pending";
            session.CreatedAt = DateTime.UtcNow;
            session.ExpiresAt = DateTime.UtcNow.AddMinutes(30);
            session.ProviderTransactionId = externalSession.SessionId;
            session.Token = accessToken;

            if (existing == null)
                _kycSessionRepository.Insert(session);

            _context.SaveChanges();

            return Ok(new
            {
                kycId = session.KycId,
                accessToken = accessToken,
                externalSessionId = externalSession.SessionId,
                externalToken = externalSession.Token,
                expiresAt = session.ExpiresAt,
                status = "pending"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting KYC scan session");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Validate a scan token and return session info (public, no JWT needed).
    /// </summary>
    [HttpGet("session/{token}")]
    public IActionResult GetSession(string token)
    {
        var session = FindSessionByToken(token);
        if (session == null)
            return NotFound(new { message = "Invalid or expired KYC session" });

        return Ok(new
        {
            kycId = session.KycId,
            status = session.Status,
            expiresAt = session.ExpiresAt
        });
    }

    /// <summary>
    /// Submit document images for OCR (public, token-based auth).
    /// </summary>
    [HttpPost("document/{token}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> SubmitDocument(string token, [FromForm] KycDocumentUpload upload)
    {
        var session = FindSessionByToken(token);
        if (session == null)
            return NotFound(new { message = "Invalid or expired KYC session" });

        if (upload.DocumentFront == null || upload.DocumentFront.Length == 0)
            return BadRequest(new { message = "Document front image is required" });

        try
        {
            var frontBytes = await ReadFormFile(upload.DocumentFront);
            byte[]? backBytes = null;
            if (upload.DocumentBack != null && upload.DocumentBack.Length > 0)
                backBytes = await ReadFormFile(upload.DocumentBack);

            var result = await _externalKyc.SubmitDocumentOcrAsync(
                session.ProviderTransactionId!, session.Token!, frontBytes, backBytes);

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
            _logger.LogError(ex, "Error submitting document via scan");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Submit selfie for liveness detection (public, token-based auth).
    /// </summary>
    [HttpPost("liveness/{token}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> SubmitLiveness(string token, [FromForm] KycSelfieUpload upload)
    {
        var session = FindSessionByToken(token);
        if (session == null)
            return NotFound(new { message = "Invalid or expired KYC session" });

        if (upload.Selfie == null || upload.Selfie.Length == 0)
            return BadRequest(new { message = "Selfie image is required" });

        try
        {
            var selfieBytes = await ReadFormFile(upload.Selfie);
            var result = await _externalKyc.SubmitLivenessAsync(
                session.ProviderTransactionId!, session.Token!, selfieBytes);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting liveness via scan");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Submit face comparison (public, token-based auth). Also triggers final decision.
    /// </summary>
    [HttpPost("face-compare/{token}")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> SubmitFaceCompare(string token, [FromForm] KycFaceCompareUpload upload)
    {
        var session = FindSessionByToken(token);
        if (session == null)
            return NotFound(new { message = "Invalid or expired KYC session" });

        if (upload.DocumentPhoto == null || upload.Selfie == null)
            return BadRequest(new { message = "Document photo and selfie are required" });

        try
        {
            var docBytes = await ReadFormFile(upload.DocumentPhoto);
            var selfieBytes = await ReadFormFile(upload.Selfie);

            var result = await _externalKyc.SubmitFaceCompareAsync(
                session.ProviderTransactionId!, session.Token!, docBytes, selfieBytes);

            var decision = await _externalKyc.GetDecisionAsync(session.ProviderTransactionId!);

            if (decision.Code == 9001)
            {
                session.Status = "verified";
                session.VerifiedAt = DateTime.UtcNow;
                if (decision.Person != null)
                {
                    session.Cnp = decision.Person.IdNumber;
                    session.City = decision.Person.PlaceOfBirth;
                    if (decision.Person.Addresses?.Count > 0)
                        session.Address = decision.Person.Addresses[0].FullAddress;
                }
            }
            else if (decision.Code == 9102)
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
                    decision.Reason
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in face compare via scan");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get KYC session status (public, token-based auth).
    /// Polls external KYC service if still pending.
    /// </summary>
    [HttpGet("status/{token}")]
    public async Task<IActionResult> GetStatus(string token)
    {
        var session = FindSessionByToken(token);
        if (session == null)
            return NotFound(new { message = "Invalid or expired KYC session" });

        // If still pending, check external KYC service for completion
        if (session.Status == "pending" && !string.IsNullOrEmpty(session.ProviderTransactionId))
        {
            try
            {
                var externalStatus = await _externalKyc.GetSessionStatusAsync(session.ProviderTransactionId);

                if (externalStatus.Status == "Completed")
                {
                    var decision = await _externalKyc.GetDecisionAsync(session.ProviderTransactionId);

                    if (decision.Code == 9001)
                    {
                        session.Status = "verified";
                        session.VerifiedAt = DateTime.UtcNow;
                        if (decision.Person != null)
                        {
                            session.Cnp = decision.Person.IdNumber;
                            session.City = decision.Person.PlaceOfBirth;
                            if (decision.Person.Addresses?.Count > 0)
                                session.Address = decision.Person.Addresses[0].FullAddress;
                        }
                    }
                    else if (decision.Code == 9102)
                    {
                        session.Status = "rejected";
                        session.RejectionReason = decision.Reason ?? "Verificarea a esuat";
                    }

                    _context.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error checking external KYC status for session {SessionId}", session.ProviderTransactionId);
            }
        }

        return Ok(new
        {
            kycId = session.KycId,
            status = session.Status,
            verifiedAt = session.VerifiedAt,
            rejectionReason = session.RejectionReason
        });
    }

    // ── Helpers ──

    private KycSession? FindSessionByToken(string token)
    {
        if (string.IsNullOrEmpty(token)) return null;

        var session = _kycSessionRepository.Get()
            .FirstOrDefault(k => k.Token == token && k.KycType == "USER_KYC");

        if (session == null) return null;
        if (session.ExpiresAt.HasValue && session.ExpiresAt.Value < DateTime.UtcNow) return null;

        return session;
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
