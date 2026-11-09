using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Administrator,Broker")]
    public class CrmController : BaseController
    {
        private readonly ICrmDashboardService _dashboard;
        private readonly ICrmService _crm;

        public CrmController(ICrmDashboardService dashboard, ICrmService crm)
        {
            _dashboard = dashboard;
            _crm = crm;
        }

        [HttpGet("dashboard")]
        public IActionResult GetDashboard()
        {
            return Ok(_dashboard.GetSummary());
        }

        [HttpGet("clients")]
        public IActionResult GetClients()
        {
            return Ok(_crm.GetClients());
        }

        [HttpGet("clients/{userId:int}")]
        public IActionResult GetClient(int userId)
        {
            var client = _crm.GetClient(userId);
            if (client == null) return NotFound("Clientul nu a fost găsit");
            return Ok(client);
        }

        [HttpGet("files")]
        public IActionResult GetFiles()
        {
            return Ok(_crm.GetFiles());
        }

        [HttpGet("offers")]
        public IActionResult GetOffers()
        {
            return Ok(_crm.GetOffers());
        }

        private static readonly string[] AllowedAnafTypes =
            { "application/pdf", "image/jpeg", "image/jpg", "image/png" };

        [HttpGet("clients/{userId:int}/anaf")]
        public IActionResult GetClientAnaf(int userId)
        {
            var file = _crm.GetClientAnaf(userId);
            if (file == null) return NotFound("Clientul nu are document ANAF.");
            return File(file.Content, file.MimeType, file.FileName);
        }

        [HttpPost("clients/{userId:int}/anaf")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadClientAnaf(int userId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Niciun fișier încărcat.");
            if (file.Length > 10 * 1024 * 1024)
                return BadRequest("Fișierul depășește 10 MB.");

            var contentType = (file.ContentType ?? "").ToLowerInvariant();
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            var okType = AllowedAnafTypes.Contains(contentType)
                || ext is ".pdf" or ".jpg" or ".jpeg" or ".png";
            if (!okType)
                return BadRequest("Format acceptat: PDF, JPG sau PNG.");

            byte[] content;
            await using (var ms = new MemoryStream())
            {
                await file.CopyToAsync(ms);
                content = ms.ToArray();
            }

            var mime = AllowedAnafTypes.Contains(contentType) ? contentType : "application/pdf";
            var result = _crm.UploadClientAnaf(userId, content, file.FileName, mime);
            if (!result.Ok)
                return Conflict("Clientul nu are încă un acord/KYC la care să atașez documentul ANAF.");

            return Ok(new { message = "Document ANAF încărcat." });
        }
    }
}
