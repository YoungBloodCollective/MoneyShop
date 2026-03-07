using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Document;
using MoneyShop.ServiceInterface.Interfaces.Mandate;
using MoneyShop.DomainServices.RepositoryInterfaces.Mandate;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;
using MoneyShop.DomainServices.RepositoryInterfaces.Consent;
using System;
using System.Linq;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MandateController : BaseController
    {
        private readonly IMandateService _mandateService;
        private readonly IPdfGenerationService _pdfService;
        private readonly IMandateRepository _mandateRepository;
        private readonly IUserRepository _userRepository;
        private readonly IConsentRepository _consentRepository;

        public MandateController(
            IMandateService mandateService,
            IPdfGenerationService pdfService,
            IMandateRepository mandateRepository,
            IUserRepository userRepository,
            IConsentRepository consentRepository)
        {
            _mandateService = mandateService;
            _pdfService = pdfService;
            _mandateRepository = mandateRepository;
            _userRepository = userRepository;
            _consentRepository = consentRepository;
        }

        [HttpGet("list/{userId}")]
        public IActionResult GetMandates(int userId)
        {
            var mandates = _mandateRepository.Get()
                .Where(m => m.UserId == userId)
                .OrderByDescending(m => m.GrantedAt)
                .Select(m => new
                {
                    m.MandateId, m.MandateType, m.Scope, m.Status, m.GrantedAt, m.ExpiresAt, m.RevokedAt,
                    DaysRemaining = m.Status == "active" ? (int)Math.Max(0, (m.ExpiresAt - DateTime.UtcNow).TotalDays) : 0,
                    IsExpired = m.ExpiresAt < DateTime.UtcNow
                })
                .ToList();

            return Ok(new { mandates });
        }

        [HttpGet("{mandateId}")]
        public IActionResult GetMandate(Guid mandateId)
        {
            var mandate = _mandateRepository.Get().FirstOrDefault(m => m.MandateId == mandateId);
            if (mandate == null) return NotFound(new { message = "Mandate not found" });

            return Ok(new
            {
                mandate.MandateId, mandate.MandateType, mandate.Scope, mandate.Status,
                mandate.GrantedAt, mandate.ExpiresAt, mandate.RevokedAt, mandate.RevokedReason,
                DaysRemaining = mandate.Status == "active" ? (int)Math.Max(0, (mandate.ExpiresAt - DateTime.UtcNow).TotalDays) : 0,
                IsExpired = mandate.ExpiresAt < DateTime.UtcNow
            });
        }

        [HttpPost("{mandateId}/revoke")]
        public async Task<IActionResult> RevokeMandate(Guid mandateId, [FromBody] RevokeRequest request)
        {
            var mandate = _mandateRepository.Get().FirstOrDefault(m => m.MandateId == mandateId);
            if (mandate == null) return NotFound(new { message = "Mandate not found" });
            if (mandate.Status != "active") return BadRequest(new { message = "Mandate is not active" });

            mandate.Status = "revoked";
            mandate.RevokedAt = DateTime.UtcNow;
            mandate.RevokedReason = request?.Reason ?? "User requested revocation";
            await _mandateRepository.SaveChangesAsync();

            return Ok(new { message = "Mandate revoked successfully", mandate.MandateId, mandate.Status, mandate.RevokedAt });
        }

        [HttpPost("{mandateId}/generate-pdf")]
        public IActionResult GeneratePdf(Guid mandateId)
        {
            var mandate = _mandateRepository.Get().FirstOrDefault(m => m.MandateId == mandateId);
            if (mandate == null) return NotFound(new { message = "Mandate not found" });

            var consent = _consentRepository.Get()
                .FirstOrDefault(c => c.UserId == mandate.UserId &&
                                   c.ConsentType.Contains("MANDATE") &&
                                   c.GrantedAt >= mandate.GrantedAt.AddSeconds(-5) &&
                                   c.GrantedAt <= mandate.GrantedAt.AddSeconds(5));

            try
            {
                var result = _pdfService.GenerateMandatePdf(
                    mandate.MandateId, mandate.UserId, mandate.MandateType,
                    consent?.ConsentTextSnapshot, mandate.ConsentEventId,
                    consent?.Ip, consent?.UserAgent, mandate.GrantedAt, mandate.ExpiresAt);

                return Ok(new
                {
                    message = "PDF generated successfully",
                    blobPath = result.BlobPath, sha256 = result.Sha256Base64,
                    fileSize = result.FileSize, generatedAt = result.GeneratedAt,
                    downloadUrl = $"/api/mandate/{mandateId}/download"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error generating PDF: {ex.Message}" });
            }
        }

        [HttpGet("{mandateId}/download")]
        public IActionResult DownloadPdf(Guid mandateId)
        {
            var mandate = _mandateRepository.Get().FirstOrDefault(m => m.MandateId == mandateId);
            if (mandate == null) return NotFound(new { message = "Mandate not found" });

            var year = mandate.GrantedAt.Year;
            var month = mandate.GrantedAt.Month.ToString("D2");
            var blobPath = $"ms-docs/mandates/{year}/{month}/{mandateId}.pdf";
            var localPath = System.IO.Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", blobPath);

            if (!System.IO.File.Exists(localPath))
            {
                var generateResult = GeneratePdf(mandateId);
                if (generateResult is not OkObjectResult) return generateResult;
            }

            if (!System.IO.File.Exists(localPath))
                return NotFound(new { message = "PDF file not found" });

            var fileBytes = System.IO.File.ReadAllBytes(localPath);
            var fileName = $"Mandat_{mandate.MandateType}_{mandate.GrantedAt:yyyyMMdd}.pdf";
            return File(fileBytes, "application/pdf", fileName);
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateMandate([FromBody] CreateMandateRequest request)
        {
            if (request == null || request.UserId <= 0)
                return BadRequest(new { message = "Invalid request" });

            var user = _userRepository.Get().FirstOrDefault(u => u.IdUtilizator == request.UserId);
            if (user == null) return NotFound(new { message = "User not found" });

            var mandate = new MoneyShop.DomainModel.Entities.Mandate
            {
                MandateId = Guid.NewGuid(),
                UserId = request.UserId,
                MandateType = request.MandateType ?? "ANAF",
                Scope = request.Scope ?? "credit_eligibility_only",
                Status = "active",
                GrantedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(request.ExpiresInDays > 0 ? request.ExpiresInDays : 30),
                ConsentEventId = request.ConsentEventId
            };

            _mandateRepository.Insert(mandate);

            var consent = new MoneyShop.DomainModel.Entities.Consent
            {
                ConsentId = Guid.NewGuid(),
                UserId = request.UserId,
                ConsentType = $"MANDATE_{request.MandateType ?? "ANAF"}",
                Status = "granted",
                GrantedAt = DateTime.UtcNow,
                ConsentTextSnapshot = request.ConsentText ?? GetDefaultConsentText(request.MandateType),
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = HttpContext.Request.Headers["User-Agent"].ToString(),
                SourceChannel = request.SourceChannel ?? "web"
            };

            _consentRepository.Insert(consent);
            await _consentRepository.SaveChangesAsync();

            return Ok(new
            {
                message = "Mandate created successfully",
                mandateId = mandate.MandateId,
                status = mandate.Status,
                grantedAt = mandate.GrantedAt,
                expiresAt = mandate.ExpiresAt
            });
        }

        private string GetDefaultConsentText(string? mandateType)
        {
            return mandateType?.ToUpper() switch
            {
                "ANAF" => "Imputernicesc MoneyShop sa interogheze ANAF pentru verificarea veniturilor mele in scopul determinarii eligibilitatii pentru credite. Valabilitate: 30 de zile.",
                "BC" => "Imputernicesc MoneyShop sa interogheze Biroul de Credit pentru o analiza completa a eligibilitatii mele. Valabilitate: 30 de zile.",
                "ANAF_BC" => "Imputernicesc MoneyShop sa interogheze ANAF si Biroul de Credit pentru o analiza completa a eligibilitatii mele. Valabilitate: 30 de zile.",
                _ => "Imputernicesc MoneyShop pentru verificarea eligibilitatii creditului. Valabilitate: 30 de zile."
            };
        }
    }

    public class RevokeRequest
    {
        public string? Reason { get; set; }
    }

    public class CreateMandateRequest
    {
        public int UserId { get; set; }
        public string? MandateType { get; set; }
        public string? Scope { get; set; }
        public int ExpiresInDays { get; set; } = 30;
        public string? ConsentEventId { get; set; }
        public string? ConsentText { get; set; }
        public string? SourceChannel { get; set; }
    }
}
