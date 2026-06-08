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
    public class AppointmentsController : BaseController
    {
        private readonly MoneyShopDbContext _db;
        private readonly ILogger<AppointmentsController> _logger;
        private readonly EmailService _emailService;
        private const string NotificationEmail = "alex.moore@moneyshop.ro";

        public AppointmentsController(MoneyShopDbContext db, ILogger<AppointmentsController> logger, EmailService emailService)
        {
            _db = db;
            _logger = logger;
            _emailService = emailService;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nume) || string.IsNullOrWhiteSpace(request.Telefon))
                return BadRequest(new { message = "Nume si telefon sunt obligatorii." });

            var appointment = new Appointment
            {
                Nume = request.Nume.Trim(),
                Prenume = request.Prenume?.Trim() ?? "",
                Judet = request.Judet?.Trim() ?? "",
                TipCredit = request.TipCredit?.Trim() ?? "",
                SalariuNet = request.SalariuNet,
                Telefon = request.Telefon.Trim(),
                Email = request.Email?.Trim() ?? "",
                Status = "Nou",
                IntarzieriBirou = string.IsNullOrWhiteSpace(request.IntarzieriBirou) ? null : request.IntarzieriBirou.Trim(),
                PopriRecuperare = string.IsNullOrWhiteSpace(request.PopriRecuperare) ? null : request.PopriRecuperare.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _db.Appointments.Add(appointment);
            await _db.SaveChangesAsync();

            _logger.LogInformation("New appointment created: {Id} - {Nume} {Prenume}", appointment.Id, appointment.Nume, appointment.Prenume);

            _ = _emailService.SendAppointmentNotificationAsync(
                NotificationEmail,
                appointment.Id,
                appointment.Nume,
                appointment.Prenume,
                appointment.Telefon,
                appointment.Judet,
                appointment.TipCredit,
                appointment.SalariuNet,
                appointment.Email,
                appointment.IntarzieriBirou,
                appointment.PopriRecuperare
            );

            return Ok(new { message = "Programare inregistrata cu succes.", id = appointment.Id });
        }

        [HttpGet]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> GetAll([FromQuery] string? status = null)
        {
            var query = _db.Appointments.AsQueryable();
            if (!string.IsNullOrEmpty(status))
                query = query.Where(a => a.Status == status);

            var appointments = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(appointments);
        }

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] AppointmentStatusRequest request)
        {
            var appointment = await _db.Appointments.FindAsync(id);
            if (appointment == null) return NotFound();

            appointment.Status = request.Status;
            appointment.Notes = request.Notes ?? appointment.Notes;
            appointment.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(appointment);
        }
    }

    public class CreateAppointmentRequest
    {
        public string Nume { get; set; } = "";
        public string? Prenume { get; set; }
        public string? Judet { get; set; }
        public string? TipCredit { get; set; }
        public decimal SalariuNet { get; set; }
        public string Telefon { get; set; } = "";
        public string? Email { get; set; }
        public string? IntarzieriBirou { get; set; }
        public string? PopriRecuperare { get; set; }
    }

    public class AppointmentStatusRequest
    {
        public string Status { get; set; } = "";
        public string? Notes { get; set; }
    }
}
