using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Application;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.DomainModel.Entities;
using System.Linq;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : BaseController
    {
        private readonly IApplicationService _applicationService;
        private readonly IApplicationRepository _applicationRepository;

        public AdminController(IApplicationService applicationService, IApplicationRepository applicationRepository)
        {
            _applicationService = applicationService;
            _applicationRepository = applicationRepository;
        }

        /// <summary>
        /// Get all applications (admin only)
        /// </summary>
        [HttpGet("applications")]
        public IActionResult GetAllApplications([FromQuery] string? status, [FromQuery] string? typeCredit)
        {
            var query = _applicationRepository.Get().AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(a => a.Status == status);

            if (!string.IsNullOrEmpty(typeCredit))
                query = query.Where(a => a.TypeCredit == typeCredit);

            var applications = query.OrderByDescending(a => a.CreatedAt).ToList();
            return Ok(applications);
        }

        /// <summary>
        /// Update application status (admin only)
        /// </summary>
        [HttpPut("applications/{id}/status")]
        public IActionResult UpdateApplicationStatus(int id, [FromBody] UpdateStatusRequest request)
        {
            var application = _applicationService.GetApplicationById(id);
            if (application == null)
                return NotFound(new { message = "Application not found" });

            _applicationService.UpdateApplicationStatus(id, request.Status);
            return Ok(new { message = "Status updated successfully" });
        }

        /// <summary>
        /// Update application disbursement info (admin only)
        /// </summary>
        [HttpPut("applications/{id}/disbursement")]
        public IActionResult UpdateDisbursement(int id, [FromBody] DisbursementRequest request)
        {
            var application = _applicationService.GetApplicationById(id);
            if (application == null)
                return NotFound(new { message = "Application not found" });

            application.SumaAprobata = request.SumaAprobata;
            application.Comision = request.Comision;
            application.DataDisbursare = request.DataDisbursare;
            application.Status = "DISBURSAT";

            _applicationService.UpdateApplication(application);
            return Ok(new { message = "Disbursement info updated successfully" });
        }

        /// <summary>
        /// Get monthly report (admin only)
        /// </summary>
        [HttpGet("reports/monthly")]
        public IActionResult GetMonthlyReport([FromQuery] int month, [FromQuery] int year, [FromQuery] string? bankName, [FromQuery] string? typeCredit, [FromQuery] string? status)
        {
            var query = _applicationRepository.Get()
                .Where(a => a.CreatedAt.Year == year && a.CreatedAt.Month == month);

            if (!string.IsNullOrEmpty(bankName))
            {
                query = query.Where(a => a.ApplicationBanks.Any(ab => ab.Bank.Name.Contains(bankName)));
            }

            if (!string.IsNullOrEmpty(typeCredit))
                query = query.Where(a => a.TypeCredit == typeCredit);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(a => a.Status == status);

            var applications = query
                .Select(a => new
                {
                    a.Id,
                    ClientName = $"{a.User.Nume} {a.User.Prenume}",
                    a.TypeCredit,
                    BankName = a.ApplicationBanks.FirstOrDefault() != null ? a.ApplicationBanks.FirstOrDefault()!.Bank.Name : null,
                    a.SumaAprobata,
                    a.Comision,
                    a.DataDisbursare
                })
                .ToList();

            return Ok(applications);
        }

        /// <summary>
        /// Export report to Excel/Oblio format (admin only)
        /// </summary>
        [HttpPost("reports/export")]
        public IActionResult ExportReport([FromBody] ExportReportRequest request)
        {
            var query = _applicationRepository.Get()
                .Where(a => a.Status == "DISBURSAT" && a.DataDisbursare.HasValue);

            if (request.StartDate.HasValue)
                query = query.Where(a => a.DataDisbursare >= request.StartDate);

            if (request.EndDate.HasValue)
                query = query.Where(a => a.DataDisbursare <= request.EndDate);

            var data = query
                .Select(a => new
                {
                    a.Id,
                    ClientName = $"{a.User.Nume} {a.User.Prenume}",
                    a.TypeCredit,
                    BankName = a.ApplicationBanks.FirstOrDefault() != null ? a.ApplicationBanks.FirstOrDefault()!.Bank.Name : null,
                    a.SumaAprobata,
                    a.Comision,
                    a.DataDisbursare
                })
                .ToList();

            return Ok(data);
        }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = null!;
    }

    public class DisbursementRequest
    {
        public decimal? SumaAprobata { get; set; }
        public decimal? Comision { get; set; }
        public DateTime? DataDisbursare { get; set; }
    }

    public class ExportReportRequest
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? BankName { get; set; }
        public string? TypeCredit { get; set; }
    }
}
