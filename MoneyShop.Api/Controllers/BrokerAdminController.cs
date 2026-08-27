using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/broker-admin")]
    [Authorize(Roles = "Administrator")]
    public class BrokerAdminController : BaseController
    {
        private readonly MoneyShopDbContext _db;
        private readonly ILogger<BrokerAdminController> _logger;

        public BrokerAdminController(MoneyShopDbContext db, ILogger<BrokerAdminController> logger)
        {
            _db = db;
            _logger = logger;
        }

        [HttpGet("brokers")]
        public async Task<IActionResult> GetAllBrokers([FromQuery] string? status = null, [FromQuery] string? plan = null)
        {
            var query = _db.BrokerProfiles.Include(p => p.User).AsQueryable();

            if (!string.IsNullOrEmpty(status)) query = query.Where(p => p.Status == status);
            if (!string.IsNullOrEmpty(plan)) query = query.Where(p => p.Plan == plan);

            var brokers = await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Slug,
                    p.Plan,
                    p.Status,
                    p.IsActive,
                    p.TrialEndsAt,
                    p.SubscriptionEndsAt,
                    p.Firma,
                    p.Judet,
                    p.CreatedAt,
                    user = new
                    {
                        id = p.User.IdUtilizator,
                        email = p.User.Mail,
                        name = $"{p.User.Nume} {p.User.Prenume}".Trim(),
                        phone = p.User.NumarTelefon,
                        emailVerified = p.User.EmailVerified,
                    },
                    leadsCount = p.Leads.Count,
                    dosareCount = p.Dosare.Count,
                })
                .ToListAsync();

            return Ok(brokers);
        }

        [HttpGet("brokers/{id}")]
        public async Task<IActionResult> GetBroker(int id)
        {
            var profile = await _db.BrokerProfiles
                .Include(p => p.User)
                .Include(p => p.Leads)
                .Include(p => p.Dosare)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (profile == null) return NotFound();

            return Ok(new
            {
                profile.Id,
                profile.Slug,
                profile.Bio,
                profile.Plan,
                profile.Status,
                profile.IsActive,
                profile.TrialEndsAt,
                profile.SubscriptionEndsAt,
                profile.AnafQueriesUsed,
                profile.AnafQueriesLimit,
                profile.BcQueriesUsed,
                profile.BcQueriesLimit,
                profile.Firma,
                profile.Cui,
                profile.Judet,
                profile.Oras,
                profile.CreatedAt,
                user = new
                {
                    id = profile.User.IdUtilizator,
                    email = profile.User.Mail,
                    name = $"{profile.User.Nume} {profile.User.Prenume}".Trim(),
                    phone = profile.User.NumarTelefon,
                    emailVerified = profile.User.EmailVerified,
                },
                stats = new
                {
                    leadsTotal = profile.Leads.Count,
                    dosareTotal = profile.Dosare.Count,
                    dosareAprobate = profile.Dosare.Count(d => d.Status == "Aprobat" || d.Status == "Contractat"),
                }
            });
        }

        [HttpPatch("brokers/{id}/status")]
        public async Task<IActionResult> UpdateBrokerStatus(int id, [FromBody] AdminBrokerStatusRequest req)
        {
            var profile = await _db.BrokerProfiles.FindAsync(id);
            if (profile == null) return NotFound();

            var validStatuses = new[] { "Active", "Suspended", "Pending", "Rejected" };
            if (!validStatuses.Contains(req.Status))
                return BadRequest(new { message = $"Status invalid. Optiuni: {string.Join(", ", validStatuses)}" });

            profile.Status = req.Status;
            profile.IsActive = req.Status == "Active";
            profile.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Broker {Id} status changed to {Status}", id, req.Status);
            return Ok(new { id = profile.Id, status = profile.Status });
        }

        [HttpPatch("brokers/{id}/plan")]
        public async Task<IActionResult> AdminSetPlan(int id, [FromBody] AdminBrokerPlanRequest req)
        {
            var profile = await _db.BrokerProfiles.FindAsync(id);
            if (profile == null) return NotFound();

            var validPlans = new[] { "Trial", "Basic", "Full" };
            if (!validPlans.Contains(req.Plan))
                return BadRequest(new { message = "Plan invalid." });

            profile.Plan = req.Plan;
            if (req.MonthsExtension.HasValue)
                profile.SubscriptionEndsAt = DateTime.UtcNow.AddMonths(req.MonthsExtension.Value);

            switch (req.Plan)
            {
                case "Basic":
                    profile.AnafQueriesLimit = 20;
                    profile.BcQueriesLimit = 5;
                    break;
                case "Full":
                    profile.AnafQueriesLimit = 100;
                    profile.BcQueriesLimit = 50;
                    break;
                case "Trial":
                    profile.AnafQueriesLimit = 3;
                    profile.BcQueriesLimit = 2;
                    profile.TrialEndsAt = DateTime.UtcNow.AddDays(30);
                    break;
            }

            profile.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { id = profile.Id, plan = profile.Plan });
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GlobalStats()
        {
            var total = await _db.BrokerProfiles.CountAsync();
            var active = await _db.BrokerProfiles.CountAsync(p => p.IsActive && p.Status == "Active");
            var trial = await _db.BrokerProfiles.CountAsync(p => p.Plan == "Trial");
            var basic = await _db.BrokerProfiles.CountAsync(p => p.Plan == "Basic");
            var full = await _db.BrokerProfiles.CountAsync(p => p.Plan == "Full");
            var totalLeads = await _db.BrokerLeads.CountAsync();
            var totalDosare = await _db.BrokerDosare.CountAsync();
            var dosareAprobate = await _db.BrokerDosare.CountAsync(d => d.Status == "Aprobat" || d.Status == "Contractat");

            return Ok(new
            {
                brokeriTotal = total,
                brokeriActivi = active,
                brokeriTrial = trial,
                brokeriBasic = basic,
                brokeriFull = full,
                totalLeads,
                totalDosare,
                dosareAprobate,
            });
        }
    }

    public class AdminBrokerStatusRequest
    {
        public string Status { get; set; } = "";
    }

    public class AdminBrokerPlanRequest
    {
        public string Plan { get; set; } = "";
        public int? MonthsExtension { get; set; }
    }
}
