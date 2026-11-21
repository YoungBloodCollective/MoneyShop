using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Otp;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AppointmentsController : BaseController
    {
        private readonly MoneyShopDbContext _db;
        private readonly ILogger<AppointmentsController> _logger;
        private readonly EmailService _emailService;
        private readonly IBrokerProfileService _brokerProfiles;
        private readonly IAppointmentSchedulingService _scheduling;
        private readonly IPublicBookingService _booking;
        private readonly IConfiguration _configuration;
        private const string NotificationEmail = "alex.moore@moneyshop.ro";

        public AppointmentsController(MoneyShopDbContext db, ILogger<AppointmentsController> logger, EmailService emailService,
            IBrokerProfileService brokerProfiles, IAppointmentSchedulingService scheduling, IPublicBookingService booking,
            IConfiguration configuration)
        {
            _brokerProfiles = brokerProfiles;
            _db = db;
            _logger = logger;
            _emailService = emailService;
            _scheduling = scheduling;
            _booking = booking;
            _configuration = configuration;
        }

        private static string NormalizePhone(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return "";
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.StartsWith("40")) digits = digits.Substring(2);
            if (digits.StartsWith("0")) digits = digits.Substring(1);
            return digits;
        }

        [HttpPost]
        [AllowAnonymous]
        [EnableRateLimiting("public-form")]
        public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Nume) || string.IsNullOrWhiteSpace(request.Telefon))
                return BadRequest(new { message = "Nume si telefon sunt obligatorii." });

            if (request.SalariuNet < 2500)
                return BadRequest(new
                {
                    code = "salary_too_low",
                    message = "Salariul net minim acceptat este 2500 RON (salariul minim pe economie)."
                });

            var brokerId = _brokerProfiles.ResolvePublicLeadBrokerId(request.BrokerSlug);
            if (brokerId == null && !string.IsNullOrWhiteSpace(request.BrokerSlug))
                return BadRequest(new { message = "Brokerul nu a fost gasit." });
            var normalized = NormalizePhone(request.Telefon);
            if (normalized.Length >= 7)
            {
                var since = DateTime.UtcNow.AddDays(-7);
                var recent = await _db.Appointments
                    .Where(a => a.CreatedAt >= since && a.BrokerProfileId == brokerId)
                    .Select(a => a.Telefon)
                    .ToListAsync();
                if (recent.Any(t => NormalizePhone(t) == normalized))
                {
                    _logger.LogInformation("Duplicate appointment blocked for phone {Phone} within 7-day window.", request.Telefon);
                    return Conflict(new
                    {
                        code = "already_registered",
                        message = "Te avem deja pe lista — un consultant te va contacta in curand."
                    });
                }
            }

            // A time picked on the site must be one of the offered free slots of the broker's calendar
            // (the broker behind the link, or the default broker while the request waits in the inbox).
            DateTime? scheduledAt = null;
            string? manageToken = null;
            string? manageTokenHash = null;
            if (request.ScheduledAt.HasValue)
            {
                var capacityBroker = brokerId ?? _brokerProfiles.ResolveIntakeBrokerId(request.BrokerSlug);
                var start = request.ScheduledAt.Value.ToUniversalTime();
                if (!await _booking.IsBookableAsync(capacityBroker, start, DateTime.UtcNow))
                    return StatusCode(409, new { code = "slot_taken", message = "Intervalul ales nu mai este disponibil. Alege altă oră." });
                scheduledAt = start;
                manageToken = _booking.NewToken(out var hash);
                manageTokenHash = hash;
            }

            var appointment = new Appointment
            {
                ScheduledAt = scheduledAt,
                DurationMinutes = scheduledAt.HasValue ? _booking.SlotDurationMinutes : SchedulingRules.DefaultDuration,
                ConfirmationTokenHash = manageTokenHash,
                BrokerProfileId = brokerId,
                Nume = request.Nume.Trim(),
                Prenume = request.Prenume?.Trim() ?? "",
                Judet = request.Judet?.Trim() ?? "",
                TipCredit = request.TipCredit?.Trim() ?? "",
                SalariuNet = request.SalariuNet,
                Telefon = request.Telefon.Trim(),
                Email = request.Email?.Trim() ?? "",
                Status = "Nou",
                Source = "site",
                IntarzieriBirou = string.IsNullOrWhiteSpace(request.IntarzieriBirou) ? null : request.IntarzieriBirou.Trim(),
                PopriRecuperare = string.IsNullOrWhiteSpace(request.PopriRecuperare) ? null : request.PopriRecuperare.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            _db.Appointments.Add(appointment);
            await _db.SaveChangesAsync();

            _logger.LogInformation("New appointment created: {Id} - {Nume} {Prenume}", appointment.Id, appointment.Nume, appointment.Prenume);

            _ = _emailService.SendAppointmentNotificationAsync(
                _brokerProfiles.GetNotificationEmail(brokerId) ?? NotificationEmail,
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

            var confirmationSent = false;
            if (manageToken != null && !string.IsNullOrWhiteSpace(appointment.Email))
            {
                var root = _configuration["Brokers:RootDomain"] ?? "moneyshop.ro";
                var firstName = string.IsNullOrWhiteSpace(appointment.Prenume) ? appointment.Nume : appointment.Prenume;
                _ = _emailService.SendBookingConfirmationRequestAsync(appointment.Email, firstName, appointment.ScheduledAt!.Value,
                    appointment.DurationMinutes, $"https://{root}/programare/{manageToken}");
                confirmationSent = true;
            }

            return Ok(new
            {
                message = "Programare inregistrata cu succes.",
                id = appointment.Id,
                scheduledAt = appointment.ScheduledAt,
                confirmationSent,
            });
        }

        [HttpGet]
        [Authorize(Roles = "Administrator,Broker")]
        public async Task<IActionResult> GetAll([FromQuery] string? status = null, [FromQuery] int? brokerId = null,
            [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            var query = _db.Appointments.AsQueryable();
            if (brokerId.HasValue && User.IsInRole("Administrator"))
                query = query.Where(a => a.BrokerProfileId == brokerId.Value);
            if (!string.IsNullOrEmpty(status))
                query = query.Where(a => a.Status == status);
            // Calendar view: only appointments with a time inside [from, to).
            if (from.HasValue)
            {
                var fromUtc = from.Value.ToUniversalTime();
                query = query.Where(a => a.ScheduledAt != null && a.ScheduledAt >= fromUtc);
            }
            if (to.HasValue)
            {
                var toUtc = to.Value.ToUniversalTime();
                query = query.Where(a => a.ScheduledAt != null && a.ScheduledAt < toUtc);
            }

            var appointments = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(appointments);
        }

        /// <summary>
        /// Broker or Super Admin books a call/meeting at a time. Brokers (and a Super Admin working in
        /// their own CRM) book on their own calendar; a Super Admin in /admin picks the broker.
        /// Refused with 409 when it overlaps another appointment of the same broker.
        /// </summary>
        [HttpPost("manual")]
        [Authorize(Roles = "Administrator,Broker")]
        public async Task<IActionResult> CreateManual([FromBody] ManualAppointmentInput request)
        {
            int? owner;
            if (_db.BrokerScopeId is > 0)
            {
                owner = _db.BrokerScopeId;
            }
            else if (User.IsInRole("Administrator"))
            {
                owner = request.BrokerProfileId;
                if (owner.HasValue && !await _db.BrokerProfiles.AnyAsync(p => p.Id == owner.Value && p.Status == "Active"))
                    return BadRequest("Brokerul nu există sau nu este activ.");
            }
            else
            {
                return StatusCode(403, new { message = "Contul de broker nu este activ." });
            }

            var actor = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : (int?)null;
            var outcome = await _scheduling.CreateManualAsync(request, owner, actor);
            if (!outcome.Ok) return ScheduleErrorResult(outcome);

            var created = await _db.Appointments.AsNoTracking().FirstAsync(a => a.Id == outcome.AppointmentId);
            return Ok(created, "Programare creată");
        }

        /// <summary>Sets or moves the time of an appointment; 409 when it would overlap another one.</summary>
        [HttpPatch("{id}/schedule")]
        [Authorize(Roles = "Administrator,Broker")]
        public async Task<IActionResult> Reschedule(int id, [FromBody] RescheduleRequest request)
        {
            var outcome = await _scheduling.RescheduleAsync(id, request.ScheduledAt, request.DurationMinutes ?? SchedulingRules.DefaultDuration);
            if (!outcome.Ok) return ScheduleErrorResult(outcome);

            var updated = await _db.Appointments.AsNoTracking().FirstAsync(a => a.Id == id);
            return Ok(updated, "Programare actualizată");
        }

        private IActionResult ScheduleErrorResult(ScheduleOutcome outcome) => outcome.Error switch
        {
            ScheduleError.MissingName => BadRequest("Numele este obligatoriu."),
            ScheduleError.MissingPhone => BadRequest("Telefonul este obligatoriu."),
            ScheduleError.InvalidDuration =>
                BadRequest($"Durata trebuie să fie între {SchedulingRules.MinDuration} și {SchedulingRules.MaxDuration} de minute."),
            ScheduleError.InvalidTime => BadRequest("Data programării nu este validă."),
            ScheduleError.NotFound => NotFound("Programarea nu există."),
            _ => StatusCode(409, new
            {
                code = "slot_taken",
                message = "Intervalul se suprapune cu altă programare.",
                conflict = outcome.Conflict,
            }),
        };

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Administrator,Broker")]
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
        public string? BrokerSlug { get; set; }
        /// <summary>Optional time picked from GET /api/public/booking/slots (UTC).</summary>
        public DateTime? ScheduledAt { get; set; }
    }

    public class RescheduleRequest
    {
        public DateTime ScheduledAt { get; set; }
        public int? DurationMinutes { get; set; }
    }

    public class AppointmentStatusRequest
    {
        public string Status { get; set; } = "";
        public string? Notes { get; set; }
    }
}
