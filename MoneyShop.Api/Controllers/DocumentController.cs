using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Document;
using MoneyShop.ServiceInterface.Interfaces.Mandate;
using System.Security.Claims;
using System.IO;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DocumentController : BaseController
    {
        private readonly IPdfGenerationService _pdfService;
        private readonly IMandateService _mandateService;

        public DocumentController(
            IPdfGenerationService pdfService,
            IMandateService mandateService)
        {
            _pdfService = pdfService;
            _mandateService = mandateService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                throw new UnauthorizedAccessException("Invalid user");
            return userId;
        }

        [HttpPost("mandate/{mandateId}/generate-pdf")]
        public IActionResult GenerateMandatePdf(Guid mandateId)
        {
            try
            {
                var userId = GetUserId();
                var mandate = _mandateService.GetMandate(mandateId, userId);
                if (mandate == null)
                    return NotFound(new { message = "Mandate not found" });

                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                var result = _pdfService.GenerateMandatePdf(
                    mandateId, userId, mandate.MandateType, null, null, ip, userAgent, mandate.GrantedAt, mandate.ExpiresAt);

                return Ok(new
                {
                    blobPath = result.BlobPath,
                    sha256 = result.Sha256Base64,
                    fileSize = result.FileSize,
                    generatedAt = result.GeneratedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("mandate/{mandateId}/download")]
        public IActionResult DownloadMandatePdf(Guid mandateId)
        {
            try
            {
                var userId = GetUserId();
                var mandate = _mandateService.GetMandate(mandateId, userId);
                if (mandate == null)
                    return NotFound(new { message = "Mandate not found" });

                var year = mandate.GrantedAt.Year;
                var month = mandate.GrantedAt.Month.ToString("D2");
                var blobPath = $"ms-docs/mandates/{year}/{month}/{mandateId}.pdf";
                var localPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", blobPath);

                if (!System.IO.File.Exists(localPath))
                {
                    var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                    var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                    var pdfResult = _pdfService.GenerateMandatePdf(
                        mandateId, userId, mandate.MandateType, null, null, ip, userAgent, mandate.GrantedAt, mandate.ExpiresAt);

                    localPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", pdfResult.BlobPath);
                }

                if (!System.IO.File.Exists(localPath))
                    return NotFound(new { message = "PDF not found" });

                var fileBytes = System.IO.File.ReadAllBytes(localPath);
                return File(fileBytes, "application/pdf", $"{mandateId}.pdf");
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
