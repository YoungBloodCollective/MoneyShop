using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Chat;
using MoneyShop.ServiceInterface.Dtos.Chat;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ChatController : BaseController
    {
        private readonly IChatService _chatService;
        private readonly IRateLimitService _rateLimitService;
        private readonly ICostControlService _costControlService;
        private readonly IFaqCacheService _faqCacheService;
        private readonly ILogger<ChatController> _logger;

        public ChatController(
            IChatService chatService,
            IRateLimitService rateLimitService,
            ICostControlService costControlService,
            IFaqCacheService faqCacheService,
            ILogger<ChatController> logger)
        {
            _chatService = chatService;
            _rateLimitService = rateLimitService;
            _costControlService = costControlService;
            _faqCacheService = faqCacheService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("Id")?.Value;

                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
                    return Unauthorized(new { error = "neautorizat" });

                if (request == null || string.IsNullOrWhiteSpace(request.Message))
                    return BadRequest(new { error = "cerere_invalida", detalii = "Mesajul este obligatoriu" });

                if (request.Message.Length > 2000)
                    return BadRequest(new { error = "cerere_invalida", detalii = "Mesajul este prea lung (max 2000 caractere)" });

                try { await _rateLimitService.EnforceRateLimitAsync(userId); }
                catch (InvalidOperationException ex) when (ex.Message == "RATE_LIMIT_MINUTE")
                { return StatusCode(429, new { error = "prea_multe_cereri", fereastra = "minut" }); }
                catch (InvalidOperationException ex) when (ex.Message == "RATE_LIMIT_DAY")
                { return StatusCode(429, new { error = "prea_multe_cereri", fereastra = "zi" }); }

                try { await _costControlService.EnforceMonthlyBudgetAsync(); }
                catch (InvalidOperationException ex) when (ex.Message == "BUDGET_EXCEEDED")
                { return StatusCode(402, new { error = "buget_depasit" }); }

                var response = await _chatService.ChatAsync(request, _faqCacheService);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la procesarea chat request");
                return StatusCode(500, new { error = "eroare_server", code = ex.Message });
            }
        }

        [HttpGet("initial")]
        [AllowAnonymous]
        public IActionResult GetInitialMessage()
        {
            return Ok(new
            {
                mesaj = "Salut! Sunt Asistentul Virtual MoneyShop. Te pot ajuta cu explicatii despre credite, eligibilitate si documente, precum si cu intelegerea rezultatelor din calculator. Nu pot recomanda sau mentiona nume de banci. Spune-mi, te rog, ce vrei sa afli?",
                disclaimer = "Asistentul virtual MoneyShop ofera informatii generale si explicatii educationale despre credite si procesul de aplicare. Nu reprezinta consultanta financiara sau juridica personalizata si nu garanteaza aprobarea unui credit sau o dobanda anume. MoneyShop (POPIX BROKERAGE CONSULTING S.R.L.) este broker/intermediar de credite, nu institutie de credit. Pentru o analiza personalizata si recomandari adaptate situatiei tale, te rugam sa discuti cu un broker autorizat. Nota: Rezultatele afisate in calculator sunt estimative; aprobarea finala apartine creditorului."
            });
        }
    }
}
