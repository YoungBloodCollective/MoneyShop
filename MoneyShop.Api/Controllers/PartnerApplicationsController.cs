using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Otp;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PartnerApplicationsController : BaseController
    {
        private readonly MoneyShopDbContext _db;
        private readonly ILogger<PartnerApplicationsController> _logger;
        private readonly EmailService _emailService;
        private const string NotificationEmail = "alex.moore@moneyshop.ro";

        public PartnerApplicationsController(MoneyShopDbContext db, ILogger<PartnerApplicationsController> logger, EmailService emailService)
        {
            _db = db;
            _logger = logger;
            _emailService = emailService;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Create([FromBody] CreatePartnerApplicationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nume) || string.IsNullOrWhiteSpace(request.Telefon))
                return BadRequest(new { message = "Nume si telefon sunt obligatorii." });

            var application = new PartnerApplication
            {
                Nume = request.Nume.Trim(),
                Prenume = request.Prenume?.Trim() ?? "",
                Telefon = request.Telefon.Trim(),
                Email = request.Email?.Trim() ?? "",
                Judet = request.Judet?.Trim() ?? "",
                Descriere = request.Descriere?.Trim() ?? "",
                Status = "Nou",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _db.PartnerApplications.Add(application);
            await _db.SaveChangesAsync();

            _logger.LogInformation("New partner application: {Id} - {Nume} {Prenume}", application.Id, application.Nume, application.Prenume);

            _ = _emailService.SendPartnerApplicationNotificationAsync(
                NotificationEmail,
                application.Id,
                application.Nume,
                application.Prenume,
                application.Telefon,
                application.Judet,
                application.Email,
                application.Descriere
            );

            return Ok(new { message = "Cererea ta a fost inregistrata.", id = application.Id });
        }

        [HttpGet]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> GetAll([FromQuery] string? status = null)
        {
            var query = _db.PartnerApplications.AsQueryable();
            if (!string.IsNullOrEmpty(status))
                query = query.Where(a => a.Status == status);

            var applications = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(applications);
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] PartnerStatusRequest request)
        {
            var application = await _db.PartnerApplications.FindAsync(id);
            if (application == null) return NotFound();

            application.Status = request.Status;
            application.Notes = request.Notes ?? application.Notes;
            application.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(application);
        }
    }

    public class CreatePartnerApplicationRequest
    {
        public string Nume { get; set; } = "";
        public string? Prenume { get; set; }
        public string? Telefon { get; set; }
        public string? Email { get; set; }
        public string? Judet { get; set; }
        public string? Descriere { get; set; }
    }

    public class PartnerStatusRequest
    {
        public string Status { get; set; } = "";
        public string? Notes { get; set; }
    }
}
