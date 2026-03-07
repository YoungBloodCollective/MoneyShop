using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Application;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.DomainModel.Entities;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DocumentsController : BaseController
    {
        private readonly IApplicationService _applicationService;
        private readonly IDocumentRepository _documentRepository;

        public DocumentsController(IApplicationService applicationService, IDocumentRepository documentRepository)
        {
            _applicationService = applicationService;
            _documentRepository = documentRepository;
        }

        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadDocument([FromForm] UploadDocumentRequest request)
        {
            var file = request.File;
            var applicationId = request.ApplicationId;
            var docType = request.DocType;
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded" });

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var application = _applicationService.GetApplicationById(applicationId);
            if (application == null) return NotFound(new { message = "Application not found" });
            if (application.UserId != userId) return Forbid();

            var document = new Document
            {
                ApplicationId = applicationId,
                DocType = docType,
                AzureBlobPath = $"temp/{applicationId}/{file.FileName}",
                FileName = file.FileName,
                FileSize = file.Length,
                MimeType = file.ContentType,
                CreatedAt = DateTime.UtcNow
            };

            _documentRepository.Insert(document);
            await _documentRepository.SaveChangesAsync();

            return Ok(new { id = document.Id, message = "Document uploaded successfully" });
        }

        [HttpGet("application/{applicationId}")]
        public IActionResult GetApplicationDocuments(int applicationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var application = _applicationService.GetApplicationById(applicationId);
            if (application == null) return NotFound(new { message = "Application not found" });
            if (application.UserId != userId) return Forbid();

            var documents = _documentRepository.Get().Where(d => d.ApplicationId == applicationId).ToList();
            return Ok(documents);
        }

        [HttpGet("{id}")]
        public IActionResult GetDocument(int id)
        {
            var document = _documentRepository.Get().FirstOrDefault(d => d.Id == id);
            if (document == null) return NotFound(new { message = "Document not found" });

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var application = _applicationService.GetApplicationById(document.ApplicationId);
            if (application == null || application.UserId != userId) return Forbid();

            return Ok(document);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDocument(int id)
        {
            var document = _documentRepository.Get().FirstOrDefault(d => d.Id == id);
            if (document == null) return NotFound();

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var application = _applicationService.GetApplicationById(document.ApplicationId);
            if (application == null || application.UserId != userId) return Forbid();

            _documentRepository.Delete(document);
            await _documentRepository.SaveChangesAsync();

            return NoContent();
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return null;
            return userId;
        }
    }

    public class UploadDocumentRequest
    {
        public IFormFile File { get; set; } = null!;
        public int ApplicationId { get; set; }
        public string DocType { get; set; } = null!;
    }
}
