using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/broker-profile")]
    [Authorize(Roles = "Broker")]
    public class BrokerProfileController : BaseController
    {
        private readonly MoneyShopDbContext _db;
        private readonly ILogger<BrokerProfileController> _logger;

        public BrokerProfileController(MoneyShopDbContext db, ILogger<BrokerProfileController> logger)
        {
            _db = db;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetUserId();
            var profile = await _db.BrokerProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();
            return Ok(MapProfile(profile));
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateBrokerProfileRequest req)
        {
            var userId = GetUserId();
            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(req.Bio)) profile.Bio = req.Bio.Trim();
            if (!string.IsNullOrWhiteSpace(req.Firma)) profile.Firma = req.Firma.Trim();
            if (!string.IsNullOrWhiteSpace(req.Cui)) profile.Cui = req.Cui.Trim();
            if (!string.IsNullOrWhiteSpace(req.Website)) profile.Website = req.Website.Trim();
            if (!string.IsNullOrWhiteSpace(req.Judet)) profile.Judet = req.Judet.Trim();
            if (!string.IsNullOrWhiteSpace(req.Oras)) profile.Oras = req.Oras.Trim();
            if (!string.IsNullOrWhiteSpace(req.PhotoUrl)) profile.PhotoUrl = req.PhotoUrl.Trim();
            profile.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(MapProfile(profile));
        }

        [HttpGet("slug")]
        public async Task<IActionResult> GetSlug()
        {
            var userId = GetUserId();
            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();
            return Ok(new { slug = profile.Slug, link = $"https://moneyshop.ro/apply/{profile.Slug}" });
        }

        [HttpPatch("slug")]
        public async Task<IActionResult> UpdateSlug([FromBody] UpdateSlugRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Slug))
                return BadRequest(new { message = "Slug-ul nu poate fi gol." });

            var cleanSlug = Regex.Replace(req.Slug.Trim().ToLowerInvariant(), @"[^a-z0-9\-]", "");
            cleanSlug = Regex.Replace(cleanSlug, @"\-+", "-").Trim('-');

            if (cleanSlug.Length < 3)
                return BadRequest(new { message = "Slug-ul trebuie sa aiba minim 3 caractere." });

            var userId = GetUserId();
            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();

            var exists = await _db.BrokerProfiles.AnyAsync(p => p.Slug == cleanSlug && p.Id != profile.Id);
            if (exists)
                return Conflict(new { message = "Acest slug este deja folosit. Alege altul." });

            profile.Slug = cleanSlug;
            profile.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { slug = cleanSlug, link = $"https://moneyshop.ro/apply/{cleanSlug}" });
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var userId = GetUserId();
            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();

            var now = DateTime.UtcNow;
            var firstOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var leadsTotal = await _db.BrokerLeads.CountAsync(l => l.BrokerProfileId == profile.Id);
            var leadsThisMonth = await _db.BrokerLeads
                .CountAsync(l => l.BrokerProfileId == profile.Id && l.CreatedAt >= firstOfMonth);
            var dosareActive = await _db.BrokerDosare
                .CountAsync(d => d.BrokerProfileId == profile.Id && d.Status != "Aprobat" && d.Status != "Respins" && d.Status != "Retras" && d.Status != "Contractat");
            var dosareAprobate = await _db.BrokerDosare
                .CountAsync(d => d.BrokerProfileId == profile.Id && (d.Status == "Aprobat" || d.Status == "Contractat"));
            var dosareTotal = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id);
            var notificariNecitite = await _db.BrokerNotifications
                .CountAsync(n => n.BrokerProfileId == profile.Id && !n.IsRead);

            var rataConversie = dosareTotal > 0
                ? Math.Round((double)dosareAprobate / dosareTotal * 100, 1)
                : 0;

            return Ok(new
            {
                leadsTotal,
                leadsThisMonth,
                dosareActive,
                dosareAprobate,
                dosareTotal,
                notificariNecitite,
                rataConversie,
                plan = profile.Plan,
                anafQueriesUsed = profile.AnafQueriesUsed,
                anafQueriesLimit = profile.AnafQueriesLimit,
                bcQueriesUsed = profile.BcQueriesUsed,
                bcQueriesLimit = profile.BcQueriesLimit,
                trialEndsAt = profile.TrialEndsAt,
                subscriptionEndsAt = profile.SubscriptionEndsAt,
            });
        }

        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications([FromQuery] bool unreadOnly = false)
        {
            var userId = GetUserId();
            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();

            var query = _db.BrokerNotifications
                .Where(n => n.BrokerProfileId == profile.Id);
            if (unreadOnly) query = query.Where(n => !n.IsRead);

            var items = await query.OrderByDescending(n => n.CreatedAt).Take(50).ToListAsync();
            return Ok(items);
        }

        [HttpPatch("notifications/read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var userId = GetUserId();
            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();

            await _db.BrokerNotifications
                .Where(n => n.BrokerProfileId == profile.Id && !n.IsRead)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

            return Ok(new { message = "Toate notificarile au fost marcate ca citite." });
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(claim, out int id);
            return id;
        }

        private static object MapProfile(DomainModel.Entities.BrokerProfile p) => new
        {
            id = p.Id,
            userId = p.UserId,
            slug = p.Slug,
            bio = p.Bio,
            photoUrl = p.PhotoUrl,
            plan = p.Plan,
            status = p.Status,
            isActive = p.IsActive,
            trialEndsAt = p.TrialEndsAt,
            subscriptionEndsAt = p.SubscriptionEndsAt,
            anafQueriesUsed = p.AnafQueriesUsed,
            anafQueriesLimit = p.AnafQueriesLimit,
            bcQueriesUsed = p.BcQueriesUsed,
            bcQueriesLimit = p.BcQueriesLimit,
            firma = p.Firma,
            cui = p.Cui,
            website = p.Website,
            judet = p.Judet,
            oras = p.Oras,
            createdAt = p.CreatedAt,
        };
    }

    public class UpdateBrokerProfileRequest
    {
        public string? Bio { get; set; }
        public string? PhotoUrl { get; set; }
        public string? Firma { get; set; }
        public string? Cui { get; set; }
        public string? Website { get; set; }
        public string? Judet { get; set; }
        public string? Oras { get; set; }
    }

    public class UpdateSlugRequest
    {
        public string Slug { get; set; } = "";
    }
}
