using System.IO;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Audit;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers
{
    /// <summary>
    /// The client's folder in the CRM: the broker uploads documents (income certificates, bank forms,
    /// statements…) into a folder (Acord, Venituri, Biroul de Credit, a bank, Altele), opens and
    /// deletes them. Every open and delete is recorded in the audit log.
    /// </summary>
    [ApiController]
    [Route("api/crm")]
    [Authorize(Roles = "Administrator,Broker")]
    public class ClientDocumentsController : BaseController
    {
        private const long MaxBytes = 20 * 1024 * 1024;

        private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = "application/pdf",
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp",
            [".heic"] = "image/heic",
            [".doc"] = "application/msword",
            [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            [".xls"] = "application/vnd.ms-excel",
            [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };

        private readonly IClientDocumentService _documents;
        private readonly ICrmService _crm;
        private readonly IAuditService _audit;

        public ClientDocumentsController(IClientDocumentService documents, ICrmService crm, IAuditService audit)
        {
            _documents = documents;
            _crm = crm;
            _audit = audit;
        }

        [HttpGet("clients/{userId:int}/documents")]
        public IActionResult List(int userId)
        {
            if (!_crm.IsClientVisible(userId)) return NotFound("Clientul nu există sau nu îți este atribuit.");
            return Ok(_documents.List(userId));
        }

        [HttpPost("clients/{userId:int}/documents")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(25_000_000)]
        public async Task<IActionResult> Upload(int userId, IFormFile file, [FromForm] string? folder, [FromForm] string? bankName)
        {
            if (!_crm.IsClientVisible(userId)) return NotFound("Clientul nu există sau nu îți este atribuit.");
            if (file == null || file.Length == 0) return BadRequest("Niciun fișier încărcat.");
            if (file.Length > MaxBytes) return BadRequest("Fișierul depășește 20 MB.");
            if (folder == null || !ClientDocumentFolders.All.Contains(folder)) return BadRequest("Alege dosarul.");
            if (folder == ClientDocumentFolders.Banca && string.IsNullOrWhiteSpace(bankName)) return BadRequest("Alege banca.");

            var ext = Path.GetExtension(file.FileName ?? string.Empty);
            if (!AllowedTypes.TryGetValue(ext, out var mime))
                return BadRequest("Format acceptat: PDF, imagine (JPG, PNG, HEIC), Word sau Excel.");

            byte[] content;
            await using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms);
                content = ms.ToArray();
            }

            var doc = _documents.Add(userId, folder, bankName, Path.GetFileName(file.FileName ?? "document"), mime, content, ActorId());
            _audit.Log("ClientDocument", doc.Id.ToString(), "uploaded",
                newValue: new { userId, folder, doc.BankName, doc.FileSize }, reason: "crm_client_folder");
            return Ok(doc, "Document încărcat");
        }

        [HttpGet("documents/{documentId:int}")]
        public IActionResult Download(int documentId)
        {
            var file = _documents.Get(documentId);
            if (file == null) return NotFound("Documentul nu există.");
            _audit.Log("ClientDocument", file.Id.ToString(), "file_read",
                newValue: new { file.UserId }, reason: "crm_client_folder");
            Response.Headers.CacheControl = "no-store";
            return File(file.Content, file.MimeType, file.FileName);
        }

        [HttpDelete("documents/{documentId:int}")]
        public IActionResult Delete(int documentId)
        {
            if (!_documents.Delete(documentId)) return NotFound("Documentul nu există.");
            _audit.Log("ClientDocument", documentId.ToString(), "deleted", reason: "crm_client_folder");
            return Ok(new { deleted = true }, "Document șters");
        }

        private int? ActorId() =>
            int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;
    }
}
