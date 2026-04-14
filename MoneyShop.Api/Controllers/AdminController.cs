using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Application;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.DomainServices.RepositoryInterfaces.Lead;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Administrator")]
    public class AdminController : BaseController
    {
        private readonly IApplicationService _applicationService;
        private readonly IApplicationRepository _applicationRepository;
        private readonly ILeadCaptureRepository _leadCaptureRepository;
        private readonly MoneyShopDbContext _context;

        public AdminController(
            IApplicationService applicationService,
            IApplicationRepository applicationRepository,
            ILeadCaptureRepository leadCaptureRepository,
            MoneyShopDbContext context)
        {
            _applicationService = applicationService;
            _applicationRepository = applicationRepository;
            _leadCaptureRepository = leadCaptureRepository;
            _context = context;
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

        [HttpGet("leads")]
        public IActionResult GetAllLeads()
        {
            var leads = _leadCaptureRepository.Get()
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new
                {
                    l.Id,
                    l.NumePrenume,
                    l.Telefon,
                    l.Email,
                    l.Oras,
                    l.CrediteActive,
                    l.SoldTotalAprox,
                    l.TipCreditor,
                    l.Intarzieri,
                    l.IntarzieriZileMax,
                    l.VenitNetLunar,
                    l.BonuriMasaAprox,
                    l.PoprireSauExecutorUltimii5Ani,
                    l.SituatiePoprireInchisa,
                    l.Source,
                    l.AdminNotes,
                    l.CreatedAt
                })
                .ToList();
            return Ok(leads);
        }

        [HttpPost("leads/from-appointment/{appointmentId}")]
        public async Task<IActionResult> ConvertAppointmentToLead(int appointmentId)
        {
            var appointment = await _context.Appointments.FindAsync(appointmentId);
            if (appointment == null)
                return NotFound(new { message = "Appointment not found" });
            var existing = _leadCaptureRepository.Get().FirstOrDefault(l => l.Telefon == appointment.Telefon && l.Email == appointment.Email);
            if (existing != null)
                return Conflict(new { message = "Lead-ul exista deja", leadId = existing.Id });
            var lead = new LeadCapture
            {
                NumePrenume = $"{appointment.Nume} {appointment.Prenume}".Trim(),
                Telefon = appointment.Telefon,
                Email = appointment.Email,
                Oras = appointment.Judet,
                VenitNetLunar = appointment.SalariuNet,
                CrediteActive = false,
                Intarzieri = false,
                PoprireSauExecutorUltimii5Ani = false,
                Source = "appointment",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _leadCaptureRepository.Insert(lead);
            await _leadCaptureRepository.SaveChangesAsync();
            return Ok(new { message = "Lead creat cu succes", leadId = lead.Id });
        }

        [HttpPut("leads/{id}/notes")]
        public async Task<IActionResult> UpdateLeadNotes(int id, [FromBody] UpdateLeadNotesRequest request)
        {
            var lead = _leadCaptureRepository.Get().FirstOrDefault(l => l.Id == id);
            if (lead == null)
                return NotFound(new { message = "Lead not found" });
            lead.AdminNotes = request.Notes?.Length > 1000 ? request.Notes[..1000] : request.Notes;
            lead.UpdatedAt = DateTime.UtcNow;
            _leadCaptureRepository.Update(lead);
            await _leadCaptureRepository.SaveChangesAsync();
            return Ok(new { message = "Notes updated successfully" });
        }
    }

    public class UpdateLeadNotesRequest
    {
        public string? Notes { get; set; }
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
