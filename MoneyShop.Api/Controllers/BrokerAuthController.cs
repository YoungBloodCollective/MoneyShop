using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.Infrastructure.EntityFramework.Extensions.Security;
using MoneyShop.ServiceAdapters.Services.Otp;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/broker-auth")]
    public class BrokerAuthController : BaseController
    {
        private readonly MoneyShopDbContext _db;
        private readonly ILogger<BrokerAuthController> _logger;
        private readonly JwtTokenGenerator _jwt;
        private readonly EmailService _emailService;

        private static string HashPassword(string password)
        {
            using var sha = SHA256.Create();
            return Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(password)));
        }

        private static bool VerifyPassword(string entered, string stored) =>
            HashPassword(entered) == stored;

        private static string GenerateSlug(string nume, string prenume)
        {
            var raw = $"{nume}-{prenume}".ToLowerInvariant();
            raw = Regex.Replace(raw, @"[^a-z0-9\-]", "");
            raw = Regex.Replace(raw, @"\-+", "-").Trim('-');
            return raw;
        }

        public BrokerAuthController(MoneyShopDbContext db, ILogger<BrokerAuthController> logger,
            JwtTokenGenerator jwt, EmailService emailService)
        {
            _db = db;
            _logger = logger;
            _jwt = jwt;
            _emailService = emailService;
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] BrokerRegisterRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password)
                || string.IsNullOrWhiteSpace(req.Nume) || string.IsNullOrWhiteSpace(req.Telefon))
                return BadRequest(new { message = "Nume, email, telefon si parola sunt obligatorii." });

            if (await _db.Utilizatoris.AnyAsync(u => u.Mail == req.Email))
                return Conflict(new { message = "Exista deja un cont cu acest email." });

            var passwordHash = HashPassword(req.Password);

            var user = new Utilizatori
            {
                Nume = req.Nume.Trim(),
                Prenume = req.Prenume?.Trim() ?? "",
                Mail = req.Email.Trim().ToLowerInvariant(),
                Parola = passwordHash,
                NumarTelefon = req.Telefon.Trim(),
                IdRol = 3,
                EmailVerified = false,
                PhoneVerified = false,
                IsDeleted = false,
                Username = req.Email.Trim().ToLowerInvariant()
            };
            _db.Utilizatoris.Add(user);
            await _db.SaveChangesAsync();

            var baseSlug = GenerateSlug(req.Nume, req.Prenume ?? req.Nume);
            var slug = baseSlug;
            var counter = 2;
            while (await _db.BrokerProfiles.AnyAsync(p => p.Slug == slug))
                slug = $"{baseSlug}-{counter++}";

            var trialEnd = DateTime.UtcNow.AddDays(30);
            var profile = new BrokerProfile
            {
                UserId = user.IdUtilizator,
                Slug = slug,
                Plan = "Trial",
                Status = "Active",
                IsActive = true,
                TrialEndsAt = trialEnd,
                AnafQueriesLimit = 3,
                BcQueriesLimit = 2,
                Firma = req.Firma?.Trim(),
                Cui = req.Cui?.Trim(),
                Judet = req.Judet?.Trim(),
                Oras = req.Oras?.Trim(),
            };
            _db.BrokerProfiles.Add(profile);
            await _db.SaveChangesAsync();

            var token = _jwt.GenerateToken(user.IdUtilizator, user.Mail!, $"{user.Nume} {user.Prenume}", "Broker");

            _logger.LogInformation("New broker registered: {UserId} {Email} slug={Slug}", user.IdUtilizator, user.Mail, slug);

            return Ok(new
            {
                token,
                user = MapBrokerUser(user, profile)
            });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] BrokerLoginRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest(new { message = "Email si parola sunt obligatorii." });

            var user = await _db.Utilizatoris
                .FirstOrDefaultAsync(u => u.Mail == req.Email.Trim().ToLowerInvariant() && u.IdRol == 3 && u.IsDeleted != true);

            if (user == null || string.IsNullOrEmpty(user.Parola))
                return Unauthorized(new { message = "Email sau parola incorecte." });

            if (!VerifyPassword(req.Password, user.Parola))
                return Unauthorized(new { message = "Email sau parola incorecte." });

            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == user.IdUtilizator);
            if (profile == null)
                return StatusCode(500, new { message = "Profilul de broker nu a fost gasit." });

            var token = _jwt.GenerateToken(user.IdUtilizator, user.Mail!, $"{user.Nume} {user.Prenume}", "Broker");

            return Ok(new
            {
                token,
                user = MapBrokerUser(user, profile)
            });
        }

        [HttpGet("me")]
        [Authorize(Roles = "Broker")]
        public async Task<IActionResult> Me()
        {
            var userId = GetUserId();
            if (userId == 0) return Unauthorized();

            var user = await _db.Utilizatoris.FindAsync(userId);
            if (user == null) return NotFound();

            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();

            return Ok(MapBrokerUser(user, profile));
        }

        [HttpPatch("plan")]
        [Authorize(Roles = "Broker")]
        public async Task<IActionResult> SelectPlan([FromBody] BrokerPlanRequest req)
        {
            var userId = GetUserId();
            var profile = await _db.BrokerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile == null) return NotFound();

            var validPlans = new[] { "Trial", "Basic", "Full" };
            if (!validPlans.Contains(req.Plan))
                return BadRequest(new { message = "Plan invalid. Optiuni: Trial, Basic, Full." });

            profile.Plan = req.Plan;
            profile.UpdatedAt = DateTime.UtcNow;

            switch (req.Plan)
            {
                case "Basic":
                    profile.AnafQueriesLimit = 20;
                    profile.BcQueriesLimit = 5;
                    profile.SubscriptionEndsAt = DateTime.UtcNow.AddMonths(1);
                    break;
                case "Full":
                    profile.AnafQueriesLimit = 100;
                    profile.BcQueriesLimit = 50;
                    profile.SubscriptionEndsAt = DateTime.UtcNow.AddMonths(1);
                    break;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Plan actualizat.", plan = profile.Plan });
        }

        private int GetUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(claim, out int id);
            return id;
        }

        private static object MapBrokerUser(Utilizatori u, BrokerProfile p) => new
        {
            id = u.IdUtilizator,
            email = u.Mail,
            name = $"{u.Nume} {u.Prenume}".Trim(),
            role = "Broker",
            emailVerified = u.EmailVerified,
            phoneVerified = u.PhoneVerified,
            phone = u.NumarTelefon,
            brokerProfile = new
            {
                id = p.Id,
                slug = p.Slug,
                plan = p.Plan,
                status = p.Status,
                isActive = p.IsActive,
                trialEndsAt = p.TrialEndsAt,
                subscriptionEndsAt = p.SubscriptionEndsAt,
                firma = p.Firma,
                judet = p.Judet,
                oras = p.Oras,
            }
        };
    }

    public class BrokerRegisterRequest
    {
        public string Nume { get; set; } = "";
        public string? Prenume { get; set; }
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string Telefon { get; set; } = "";
        public string? Firma { get; set; }
        public string? Cui { get; set; }
        public string? Judet { get; set; }
        public string? Oras { get; set; }
    }

    public class BrokerLoginRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class BrokerPlanRequest
    {
        public string Plan { get; set; } = "";
    }
}
