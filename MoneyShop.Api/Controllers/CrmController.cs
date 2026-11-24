using System;
using System.IO;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.Infrastructure.EntityFramework.ApiResponse;
using MoneyShop.ServiceInterface.Interfaces.Audit;
using MoneyShop.ServiceInterface.Interfaces.BcReport;
using MoneyShop.ServiceInterface.Interfaces.Crm;
using MoneyShop.ServiceInterface.Interfaces.Subject;
using MoneyShop.ServiceInterface.SharedDtos;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Administrator,Broker")]
    public class CrmController : BaseController
    {
        private readonly ICrmDashboardService _dashboard;
        private readonly ICrmNetworkService _network;
        private readonly ICrmService _crm;
        private readonly IAuditService _audit;
        private readonly IBcReportService _bcReports;

        public CrmController(ICrmDashboardService dashboard, ICrmNetworkService network, ICrmService crm, IAuditService audit, IBcReportService bcReports)
        {
            _dashboard = dashboard;
            _network = network;
            _crm = crm;
            _audit = audit;
            _bcReports = bcReports;
        }

        /// <summary>
        /// The broker uploads the client's Biroul de Credit report (PDF) from the client page. It is
        /// parsed like a report the client uploads, and the debt-to-income ratio is recomputed.
        /// </summary>
        [HttpPost("clients/{userId:int}/bc-report")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(30_000_000)]
        public async Task<IActionResult> UploadClientBcReport(int userId, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Niciun fișier încărcat.");
            if (!file.FileName.EndsWith(".pdf", System.StringComparison.OrdinalIgnoreCase))
                return BadRequest("Raportul Biroului de Credit trebuie încărcat ca PDF.");
            if (!_crm.IsClientVisible(userId))
                return NotFound("Clientul nu există sau nu îți este atribuit.");

            var result = await _bcReports.UploadAndParseAsync(file, userId);
            _audit.Log("BcReport", result.ReportId.ToString(), "uploaded_by_broker",
                newValue: new { userId, fileName = file.FileName }, reason: "crm_bc_upload");

            // Keep the debt-to-income ratio in step with the new report.
            var income = _crm.GetClient(userId)?.Income;
            if (income != null)
            {
                _crm.SaveClientIncome(userId, new CrmIncomeInput
                {
                    Salariu1 = income.Salariu1,
                    Salariu2 = income.Salariu2,
                    Salariu3 = income.Salariu3,
                    BonuriMasa = income.BonuriMasa,
                });
            }

            return Ok(new
            {
                result.ReportId,
                result.FicoScore,
                result.TotalAccounts,
                result.ActiveAccounts,
                result.AccountsWithArrears,
                result.TotalMonthlyObligations,
                result.TotalAmountOwed,
                result.TotalArrears,
                result.ParseWarnings,
            }, "Raport BC încărcat");
        }

        /// <summary>Income for the last 3 months, read by the broker off the client's ANAF document.</summary>
        [HttpPut("clients/{userId:int}/income")]
        public IActionResult SaveClientIncome(int userId, [FromBody] CrmIncomeInput input)
        {
            if (!_crm.IsClientVisible(userId))
                return NotFound("Clientul nu există sau nu îți este atribuit.");
            var values = new[] { input.Salariu1, input.Salariu2, input.Salariu3, input.BonuriMasa };
            if (values.Any(v => v is < 0 or > 1_000_000))
                return BadRequest("Sumele trebuie să fie între 0 și 1.000.000 lei.");
            if (new[] { input.Salariu1, input.Salariu2, input.Salariu3 }.All(v => v is null or 0))
                return BadRequest("Completează cel puțin un salariu.");

            var snapshot = _crm.SaveClientIncome(userId, input);
            _audit.Log("UserFinancialData", userId.ToString(), "income_updated",
                newValue: new { userId }, reason: "crm_anaf_income");
            return Ok(snapshot, "Venit salvat");
        }

        [HttpGet("dashboard")]
        public IActionResult GetDashboard()
        {
            return Ok(_dashboard.GetSummary());
        }

        [HttpGet("admin-dashboard")]
        [Authorize(Roles = "Administrator")]
        public IActionResult GetAdminDashboard([FromQuery] int months = 12, [FromQuery] int? year = null, [FromQuery] int? month = null)
        {
            try { return Ok(_network.GetAdminDashboard(months, year, month)); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("network")]
        public IActionResult GetNetwork([FromQuery] int? year = null, [FromQuery] int? month = null)
        {
            var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;
            try
            {
                var summary = _network.GetNetwork(userId, User.IsInRole("Administrator"), year, month);
                return summary == null
                    ? StatusCode(403, new ApiResponse(HttpStatusCode.Forbidden, "Rețeaua MoneyShop este disponibilă doar brokerilor MoneyShop."))
                    : Ok(summary);
            }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
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

        [HttpGet("status-transitions")]
        public IActionResult GetStatusTransitions()
        {
            return Ok(ApplicationStatuses.TransitionMap);
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
            _audit.Log("KycFile", userId.ToString(), "file_read", newValue: new { userId, fileName = file.FileName }, reason: "anaf_download");
            return File(file.Content, file.MimeType, file.FileName);
        }

        [HttpGet("clients/{userId:int}/bc-report/{reportId:int}/pdf")]
        public IActionResult GetClientBcReportPdf(int userId, int reportId)
        {
            var file = _crm.GetClientBcReportPdf(userId, reportId, new CnpAccessContext
            {
                ActorUserId = GetActorUserId(),
                ActorRole = User.IsInRole("Administrator") ? "Administrator" : "Broker",
                Reason = "bc_report_download",
                Ip = GetClientIp(),
                UserAgent = Request.Headers.UserAgent.FirstOrDefault()
            });
            if (file == null) return NotFound("Clientul nu are raport BC.");
            _audit.Log("BcReport", file.ReportId.ToString(), "file_read", newValue: new { userId, fileName = file.FileName }, reason: "bc_report_download");
            Response.Headers.CacheControl = "no-store";
            Response.Headers.ContentDisposition = "inline";
            return File(file.Content, "application/pdf");
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

        private int? GetActorUserId()
        {
            var claim = User.FindFirst("Id")?.Value
                     ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }

        private string? GetClientIp()
        {
            var forwarded = Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwarded))
                return forwarded.Split(',')[0].Trim();
            return HttpContext.Connection.RemoteIpAddress?.ToString();
        }
    }
}
