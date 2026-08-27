using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Otp;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/broker-leads")]
    [Authorize(Roles = "Broker")]
    public class BrokerLeadsController : BaseController
    {
        private readonly MoneyShopDbContext _db;
        private readonly ILogger<BrokerLeadsController> _logger;
        private readonly EmailService _emailService;

        public BrokerLeadsController(MoneyShopDbContext db, ILogger<BrokerLeadsController> logger, EmailService emailService)
        {
            _db = db;
            _logger = logger;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? status = null, [FromQuery] string? search = null)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound(new { message = "Profil broker negasit." });

            var query = _db.BrokerLeads.Where(l => l.BrokerProfileId == profile.Id);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(l => l.Status == status);

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                query = query.Where(l =>
                    l.Nume.ToLower().Contains(s) ||
                    (l.Prenume != null && l.Prenume.ToLower().Contains(s)) ||
                    l.Telefon.Contains(s) ||
                    (l.Email != null && l.Email.ToLower().Contains(s)));
            }

            var leads = await query
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new
                {
                    l.Id,
                    l.Nume,
                    l.Prenume,
                    l.Telefon,
                    l.Email,
                    l.Judet,
                    l.Oras,
                    l.TipCredit,
                    l.SalariuNet,
                    l.SumaDorita,
                    l.Status,
                    l.Note,
                    l.CreatedAt,
                    l.UpdatedAt,
                    dosareCount = l.Dosare.Count
                })
                .ToListAsync();

            return Ok(leads);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var lead = await _db.BrokerLeads
                .Include(l => l.Dosare)
                .FirstOrDefaultAsync(l => l.Id == id && l.BrokerProfileId == profile.Id);

            if (lead == null) return NotFound();
            return Ok(lead);
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateLeadStatusRequest req)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var lead = await _db.BrokerLeads.FirstOrDefaultAsync(l => l.Id == id && l.BrokerProfileId == profile.Id);
            if (lead == null) return NotFound();

            lead.Status = req.Status;
            if (req.Note != null) lead.Note = req.Note;
            lead.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { id = lead.Id, status = lead.Status });
        }

        [HttpPatch("{id}/note")]
        public async Task<IActionResult> UpdateNote(int id, [FromBody] UpdateLeadNoteRequest req)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var lead = await _db.BrokerLeads.FirstOrDefaultAsync(l => l.Id == id && l.BrokerProfileId == profile.Id);
            if (lead == null) return NotFound();

            lead.Note = req.Note;
            lead.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Nota actualizata." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var lead = await _db.BrokerLeads.FirstOrDefaultAsync(l => l.Id == id && l.BrokerProfileId == profile.Id);
            if (lead == null) return NotFound();

            _db.BrokerLeads.Remove(lead);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Lead sters." });
        }

        private async Task<BrokerProfile?> GetProfile()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(claim, out int userId)) return null;
            return await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        }
    }

    public class UpdateLeadStatusRequest
    {
        public string Status { get; set; } = "";
        public string? Note { get; set; }
    }

    public class UpdateLeadNoteRequest
    {
        public string? Note { get; set; }
    }
}
