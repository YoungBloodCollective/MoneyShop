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
    [Route("api/broker-dosare")]
    [Authorize(Roles = "Broker")]
    public class BrokerDosareController : BaseController
    {
        private static readonly string[] ValidStatuses =
        {
            "Nou", "Analiza ANAF/BC", "Pregatire dosar", "Trimis la banca",
            "Analiza banca", "Aprobare conditionata", "Aprobat",
            "Contractat", "Respins", "Retras"
        };

        private readonly MoneyShopDbContext _db;
        private readonly ILogger<BrokerDosareController> _logger;
        private readonly EmailService _emailService;

        public BrokerDosareController(MoneyShopDbContext db, ILogger<BrokerDosareController> logger, EmailService emailService)
        {
            _db = db;
            _logger = logger;
            _emailService = emailService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? status = null, [FromQuery] string? search = null)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var query = _db.BrokerDosare.Where(d => d.BrokerProfileId == profile.Id);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(d => d.Status == status);

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                query = query.Where(d =>
                    d.NumeClient.ToLower().Contains(s) ||
                    d.TelefonClient.Contains(s) ||
                    (d.EmailClient != null && d.EmailClient.ToLower().Contains(s)));
            }

            var dosare = await query
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new
                {
                    d.Id,
                    d.NumeClient,
                    d.TelefonClient,
                    d.EmailClient,
                    d.TipCredit,
                    d.BancaTinta,
                    d.SumaSolicitata,
                    d.Status,
                    d.TermenLimita,
                    d.SumaAprobata,
                    d.CreatedAt,
                    d.UpdatedAt,
                    d.BrokerLeadId,
                    documentsCount = d.Documents.Count
                })
                .ToListAsync();

            return Ok(dosare);
        }

        [HttpGet("pipeline")]
        public async Task<IActionResult> GetPipeline()
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var dosare = await _db.BrokerDosare
                .Where(d => d.BrokerProfileId == profile.Id)
                .Select(d => new
                {
                    d.Id,
                    d.NumeClient,
                    d.TipCredit,
                    d.BancaTinta,
                    d.SumaSolicitata,
                    d.Status,
                    d.TermenLimita,
                    d.CreatedAt,
                })
                .ToListAsync();

            var grouped = ValidStatuses.Select(s => new
            {
                status = s,
                items = dosare.Where(d => d.Status == s).ToList()
            });

            return Ok(grouped);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var dosar = await _db.BrokerDosare
                .Include(d => d.Documents)
                .Include(d => d.StatusHistory.OrderBy(h => h.CreatedAt))
                .Include(d => d.BrokerLead)
                .FirstOrDefaultAsync(d => d.Id == id && d.BrokerProfileId == profile.Id);

            if (dosar == null) return NotFound();
            return Ok(dosar);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDosarRequest req)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            if (string.IsNullOrWhiteSpace(req.NumeClient) || string.IsNullOrWhiteSpace(req.TelefonClient))
                return BadRequest(new { message = "Nume client si telefon sunt obligatorii." });

            if (req.BrokerLeadId.HasValue)
            {
                var leadExists = await _db.BrokerLeads.AnyAsync(l => l.Id == req.BrokerLeadId && l.BrokerProfileId == profile.Id);
                if (!leadExists) return BadRequest(new { message = "Lead-ul specificat nu exista." });
            }

            var dosar = new BrokerDosar
            {
                BrokerProfileId = profile.Id,
                BrokerLeadId = req.BrokerLeadId,
                NumeClient = req.NumeClient.Trim(),
                TelefonClient = req.TelefonClient.Trim(),
                EmailClient = req.EmailClient?.Trim(),
                TipCredit = req.TipCredit?.Trim() ?? "Personal",
                BancaTinta = req.BancaTinta?.Trim(),
                SumaSolicitata = req.SumaSolicitata,
                DurataMasuri = req.DurataMasuri,
                Note = req.Note?.Trim(),
                TermenLimita = req.TermenLimita,
                Status = "Nou",
            };

            _db.BrokerDosare.Add(dosar);
            await _db.SaveChangesAsync();

            await CreateNotification(profile.Id, "NewDosar",
                "Dosar nou creat",
                $"Dosar creat pentru {dosar.NumeClient} — {dosar.TipCredit}",
                dosar.Id, "Dosar");

            return CreatedAtAction(nameof(GetById), new { id = dosar.Id }, new { id = dosar.Id, message = "Dosar creat cu succes." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateDosarRequest req)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var dosar = await _db.BrokerDosare.FirstOrDefaultAsync(d => d.Id == id && d.BrokerProfileId == profile.Id);
            if (dosar == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(req.NumeClient)) dosar.NumeClient = req.NumeClient.Trim();
            if (!string.IsNullOrWhiteSpace(req.TelefonClient)) dosar.TelefonClient = req.TelefonClient.Trim();
            if (req.EmailClient != null) dosar.EmailClient = req.EmailClient.Trim();
            if (!string.IsNullOrWhiteSpace(req.TipCredit)) dosar.TipCredit = req.TipCredit.Trim();
            if (req.BancaTinta != null) dosar.BancaTinta = req.BancaTinta.Trim();
            if (req.SumaSolicitata.HasValue) dosar.SumaSolicitata = req.SumaSolicitata;
            if (req.DurataMasuri.HasValue) dosar.DurataMasuri = req.DurataMasuri;
            if (req.Note != null) dosar.Note = req.Note.Trim();
            if (req.TermenLimita.HasValue) dosar.TermenLimita = req.TermenLimita;
            if (req.SumaAprobata.HasValue) dosar.SumaAprobata = req.SumaAprobata;
            if (req.RezultatBanca != null) dosar.RezultatBanca = req.RezultatBanca.Trim();
            dosar.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Dosar actualizat." });
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateDosarStatusRequest req)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            if (!ValidStatuses.Contains(req.Status))
                return BadRequest(new { message = $"Status invalid. Optiuni: {string.Join(", ", ValidStatuses)}" });

            var userId = GetUserId();
            var dosar = await _db.BrokerDosare.FirstOrDefaultAsync(d => d.Id == id && d.BrokerProfileId == profile.Id);
            if (dosar == null) return NotFound();

            var history = new BrokerStatusHistory
            {
                BrokerDosarId = dosar.Id,
                StatusVechi = dosar.Status,
                StatusNou = req.Status,
                Comentariu = req.Comentariu,
                ChangedByUserId = userId,
            };
            _db.BrokerStatusHistories.Add(history);

            dosar.Status = req.Status;
            dosar.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await CreateNotification(profile.Id, "StatusChange",
                $"Status dosar actualizat: {req.Status}",
                $"{dosar.NumeClient} — {req.Status}",
                dosar.Id, "Dosar");

            return Ok(new { id = dosar.Id, status = dosar.Status });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var dosar = await _db.BrokerDosare.FirstOrDefaultAsync(d => d.Id == id && d.BrokerProfileId == profile.Id);
            if (dosar == null) return NotFound();

            _db.BrokerDosare.Remove(dosar);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Dosar sters." });
        }

        private async Task CreateNotification(int brokerProfileId, string type, string title, string message, int? entityId = null, string? entityType = null)
        {
            _db.BrokerNotifications.Add(new BrokerNotification
            {
                BrokerProfileId = brokerProfileId,
                Type = type,
                Title = title,
                Message = message,
                RelatedEntityId = entityId,
                RelatedEntityType = entityType,
            });
            await _db.SaveChangesAsync();
        }

        private async Task<BrokerProfile?> GetProfile()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(claim, out int userId)) return null;
            return await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(claim, out int id);
            return id;
        }
    }

    public class CreateDosarRequest
    {
        public int? BrokerLeadId { get; set; }
        public string NumeClient { get; set; } = "";
        public string TelefonClient { get; set; } = "";
        public string? EmailClient { get; set; }
        public string? TipCredit { get; set; }
        public string? BancaTinta { get; set; }
        public decimal? SumaSolicitata { get; set; }
        public int? DurataMasuri { get; set; }
        public string? Note { get; set; }
        public DateTime? TermenLimita { get; set; }
    }

    public class UpdateDosarRequest
    {
        public string? NumeClient { get; set; }
        public string? TelefonClient { get; set; }
        public string? EmailClient { get; set; }
        public string? TipCredit { get; set; }
        public string? BancaTinta { get; set; }
        public decimal? SumaSolicitata { get; set; }
        public int? DurataMasuri { get; set; }
        public string? Note { get; set; }
        public DateTime? TermenLimita { get; set; }
        public decimal? SumaAprobata { get; set; }
        public string? RezultatBanca { get; set; }
    }

    public class UpdateDosarStatusRequest
    {
        public string Status { get; set; } = "";
        public string? Comentariu { get; set; }
    }
}
