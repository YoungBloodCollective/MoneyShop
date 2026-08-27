using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Otp;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/public")]
    public class PublicApplyController : BaseController
    {
        private readonly MoneyShopDbContext _db;
        private readonly ILogger<PublicApplyController> _logger;
        private readonly EmailService _emailService;

        public PublicApplyController(MoneyShopDbContext db, ILogger<PublicApplyController> logger, EmailService emailService)
        {
            _db = db;
            _logger = logger;
            _emailService = emailService;
        }

        [HttpGet("broker/{slug}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBrokerPublicProfile(string slug)
        {
            var profile = await _db.BrokerProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive && p.Status == "Active");

            if (profile == null)
                return NotFound(new { message = "Brokerul nu a fost gasit sau nu mai este activ." });

            return Ok(new
            {
                slug = profile.Slug,
                name = $"{profile.User.Nume} {profile.User.Prenume}".Trim(),
                photo = profile.PhotoUrl,
                bio = profile.Bio,
                firma = profile.Firma,
                judet = profile.Judet,
                phone = profile.User.NumarTelefon,
            });
        }

        [HttpPost("apply/{slug}")]
        [AllowAnonymous]
        public async Task<IActionResult> Apply(string slug, [FromBody] PublicApplyRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Nume) || string.IsNullOrWhiteSpace(req.Telefon))
                return BadRequest(new { message = "Nume si telefon sunt obligatorii." });

            var profile = await _db.BrokerProfiles
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive && p.Status == "Active");

            if (profile == null)
                return NotFound(new { message = "Brokerul nu a fost gasit." });

            var lead = new BrokerLead
            {
                BrokerProfileId = profile.Id,
                Nume = req.Nume.Trim(),
                Prenume = req.Prenume?.Trim(),
                Telefon = req.Telefon.Trim(),
                Email = req.Email?.Trim(),
                Judet = req.Judet?.Trim(),
                Oras = req.Oras?.Trim(),
                TipCredit = req.TipCredit?.Trim(),
                SalariuNet = req.SalariuNet,
                SumaDorita = req.SumaDorita,
                Status = "Nou",
                UtmSource = req.UtmSource?.Trim(),
                UtmMedium = req.UtmMedium?.Trim(),
                UtmCampaign = req.UtmCampaign?.Trim(),
            };

            _db.BrokerLeads.Add(lead);

            _db.BrokerNotifications.Add(new BrokerNotification
            {
                BrokerProfileId = profile.Id,
                Type = "NewLead",
                Title = "Lead nou!",
                Message = $"{lead.Nume} {lead.Prenume} — {lead.TipCredit ?? "Tip credit necunoscut"} — {lead.Telefon}",
                RelatedEntityType = "Lead",
            });

            await _db.SaveChangesAsync();

            _logger.LogInformation("New lead via apply: broker={BrokerSlug} lead={LeadId} {Nume}", slug, lead.Id, lead.Nume);

            var brokerEmail = profile.User.Mail;
            if (!string.IsNullOrEmpty(brokerEmail))
            {
                _ = _emailService.SendBrokerLeadNotificationAsync(
                    brokerEmail,
                    $"{profile.User.Nume} {profile.User.Prenume}".Trim(),
                    lead.Id,
                    lead.Nume,
                    lead.Prenume ?? "",
                    lead.Telefon,
                    lead.Email ?? "",
                    lead.Judet ?? "",
                    lead.TipCredit ?? "",
                    lead.SalariuNet
                );
            }

            return Ok(new
            {
                message = "Cererea ta a fost inregistrata cu succes! Brokerul te va contacta in cel mai scurt timp.",
                leadId = lead.Id
            });
        }
    }

    public class PublicApplyRequest
    {
        public string Nume { get; set; } = "";
        public string? Prenume { get; set; }
        public string Telefon { get; set; } = "";
        public string? Email { get; set; }
        public string? Judet { get; set; }
        public string? Oras { get; set; }
        public string? TipCredit { get; set; }
        public decimal? SalariuNet { get; set; }
        public decimal? SumaDorita { get; set; }
        public string? UtmSource { get; set; }
        public string? UtmMedium { get; set; }
        public string? UtmCampaign { get; set; }
    }
}
