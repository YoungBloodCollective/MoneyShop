using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/broker-reports")]
    [Authorize(Roles = "Broker")]
    public class BrokerReportsController : BaseController
    {
        private readonly MoneyShopDbContext _db;

        public BrokerReportsController(MoneyShopDbContext db)
        {
            _db = db;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var now = DateTime.UtcNow;
            var firstOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var firstOfLastMonth = firstOfMonth.AddMonths(-1);

            var leadsThisMonth = await _db.BrokerLeads.CountAsync(l => l.BrokerProfileId == profile.Id && l.CreatedAt >= firstOfMonth);
            var leadsLastMonth = await _db.BrokerLeads.CountAsync(l => l.BrokerProfileId == profile.Id && l.CreatedAt >= firstOfLastMonth && l.CreatedAt < firstOfMonth);
            var dosareActive = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id
                && d.Status != "Aprobat" && d.Status != "Contractat" && d.Status != "Respins" && d.Status != "Retras");
            var dosareAprobateThisMonth = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id
                && (d.Status == "Aprobat" || d.Status == "Contractat") && d.UpdatedAt >= firstOfMonth);
            var dosareTotal = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id);
            var dosareAprobateTotal = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id
                && (d.Status == "Aprobat" || d.Status == "Contractat"));

            var sumaAprobataThisMonth = await _db.BrokerDosare
                .Where(d => d.BrokerProfileId == profile.Id
                    && (d.Status == "Aprobat" || d.Status == "Contractat")
                    && d.UpdatedAt >= firstOfMonth
                    && d.SumaAprobata != null)
                .SumAsync(d => d.SumaAprobata ?? 0);

            var leadsPerStatus = await _db.BrokerLeads
                .Where(l => l.BrokerProfileId == profile.Id)
                .GroupBy(l => l.Status)
                .Select(g => new { status = g.Key, count = g.Count() })
                .ToListAsync();

            var dosarePerStatus = await _db.BrokerDosare
                .Where(d => d.BrokerProfileId == profile.Id)
                .GroupBy(d => d.Status)
                .Select(g => new { status = g.Key, count = g.Count() })
                .ToListAsync();

            var dosarePerTip = await _db.BrokerDosare
                .Where(d => d.BrokerProfileId == profile.Id)
                .GroupBy(d => d.TipCredit)
                .Select(g => new { tip = g.Key, count = g.Count() })
                .ToListAsync();

            return Ok(new
            {
                leadsThisMonth,
                leadsLastMonth,
                dosareActive,
                dosareAprobateThisMonth,
                dosareAprobateTotal,
                dosareTotal,
                sumaAprobataThisMonth,
                rataConversie = dosareTotal > 0 ? Math.Round((double)dosareAprobateTotal / dosareTotal * 100, 1) : 0,
                leadsPerStatus,
                dosarePerStatus,
                dosarePerTip,
            });
        }

        [HttpGet("monthly")]
        public async Task<IActionResult> Monthly([FromQuery] int months = 6)
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            months = Math.Max(1, Math.Min(24, months));
            var result = new List<object>();

            for (int i = months - 1; i >= 0; i--)
            {
                var now = DateTime.UtcNow;
                var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
                var end = start.AddMonths(1);

                var leads = await _db.BrokerLeads.CountAsync(l => l.BrokerProfileId == profile.Id && l.CreatedAt >= start && l.CreatedAt < end);
                var dosareCreate = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id && d.CreatedAt >= start && d.CreatedAt < end);
                var dosareAprobate = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id
                    && (d.Status == "Aprobat" || d.Status == "Contractat") && d.UpdatedAt >= start && d.UpdatedAt < end);

                result.Add(new
                {
                    luna = start.ToString("MMM yyyy"),
                    an = start.Year,
                    luna_nr = start.Month,
                    leads,
                    dosareCreate,
                    dosareAprobate
                });
            }

            return Ok(result);
        }

        [HttpGet("conversion-funnel")]
        public async Task<IActionResult> ConversionFunnel()
        {
            var profile = await GetProfile();
            if (profile == null) return NotFound();

            var leads = await _db.BrokerLeads.CountAsync(l => l.BrokerProfileId == profile.Id);
            var dosare = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id);
            var trimise = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id
                && d.Status != "Nou" && d.Status != "Pregatire dosar");
            var aprobate = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id
                && (d.Status == "Aprobat" || d.Status == "Aprobare conditionata" || d.Status == "Contractat"));
            var contractate = await _db.BrokerDosare.CountAsync(d => d.BrokerProfileId == profile.Id
                && d.Status == "Contractat");

            return Ok(new
            {
                etape = new[]
                {
                    new { etapa = "Lead-uri captate", valoare = leads },
                    new { etapa = "Dosare deschise", valoare = dosare },
                    new { etapa = "Trimise la banca", valoare = trimise },
                    new { etapa = "Aprobate", valoare = aprobate },
                    new { etapa = "Contractate", valoare = contractate },
                }
            });
        }

        private async Task<BrokerProfile?> GetProfile()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(claim, out int userId)) return null;
            return await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        }
    }
}
