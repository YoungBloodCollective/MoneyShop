using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Lead;
using MoneyShop.ServiceInterface.Dtos.Lead;
using MoneyShop.DomainModel.Entities;
using System;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LeadController : BaseController
    {
        private readonly ILeadCaptureService _leadService;
        private readonly ILogger<LeadController> _logger;

        public LeadController(
            ILeadCaptureService leadService,
            ILogger<LeadController> logger)
        {
            _leadService = leadService;
            _logger = logger;
        }

        [HttpPost("capture")]
        public async Task<IActionResult> CaptureLead([FromBody] LeadCaptureRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("Id")?.Value;
                int? userId = int.TryParse(userIdClaim, out var id) ? id : null;

                if (request.CrediteActive && (!request.SoldTotalAprox.HasValue || string.IsNullOrEmpty(request.TipCreditor)))
                    return BadRequest(new { error = "cerere_invalida", detalii = "SoldTotalAprox si TipCreditor sunt necesare daca ai credite active" });

                if (request.Intarzieri && !request.IntarzieriZileMax.HasValue)
                    return BadRequest(new { error = "cerere_invalida", detalii = "IntarzieriZileMax este necesar daca ai intarzieri" });

                if (request.PoprireSauExecutorUltimii5Ani && !request.SituatiePoprireInchisa.HasValue)
                    return BadRequest(new { error = "cerere_invalida", detalii = "SituatiePoprireInchisa este necesar daca ai poprire/executor" });

                var lead = await _leadService.CreateLeadAsync(userId, request, "api");

                return Ok(new LeadCaptureResponse
                {
                    LeadId = lead.Id,
                    Status = "OK",
                    Mesaj = "Multumesc! Am inregistrat datele. Un broker autorizat te va contacta pentru pasii urmatori."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la capturarea lead-ului");
                return StatusCode(500, new { error = "eroare_server", code = ex.Message });
            }
        }

        [HttpPost("next")]
        public async Task<IActionResult> LeadNext([FromBody] LeadNextRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("Id")?.Value;
                int? userId = int.TryParse(userIdClaim, out var id) ? id : null;

                var conversationId = request.ConversationId ?? "default";
                var sessionKey = $"lead_session:{userId ?? 0}:{conversationId}";

                var session = await _leadService.LoadSessionAsync(sessionKey);

                if (request.Action == "reset" || session == null)
                {
                    if (session != null) await _leadService.ClearSessionAsync(sessionKey);
                    session = await _leadService.InitSessionAsync(userId, conversationId);
                }

                if (request.Action == "start")
                {
                    return Ok(new LeadNextResponse
                    {
                        Done = false,
                        Step = session.Step,
                        Mesaj = GetPromptForStep(session.Step)
                    });
                }

                if (string.IsNullOrEmpty(request.Answer))
                    return BadRequest(new { error = "cerere_invalida", detalii = "Answer este necesar pentru action=answer" });

                var (updatedSession, error) = ProcessAnswer(session, request.Answer);
                if (!string.IsNullOrEmpty(error))
                {
                    await _leadService.SaveSessionAsync(updatedSession);
                    return Ok(new LeadNextResponse
                    {
                        Done = false,
                        Step = updatedSession.Step,
                        Mesaj = error + " " + GetPromptForStep(updatedSession.Step)
                    });
                }

                session = await _leadService.SaveSessionAsync(updatedSession);

                if (session.Step < 9)
                {
                    return Ok(new LeadNextResponse
                    {
                        Done = false,
                        Step = session.Step,
                        Mesaj = GetPromptForStep(session.Step)
                    });
                }

                var leadRequest = BuildLeadRequestFromSession(session);
                if (leadRequest == null)
                    return BadRequest(new { error = "cerere_invalida", detalii = "Datele nu sunt complete" });

                var lead = await _leadService.CreateLeadAsync(userId, leadRequest, "chat_state_machine");
                await _leadService.ClearSessionAsync(sessionKey);

                return Ok(new LeadNextResponse
                {
                    Done = true,
                    Step = 9,
                    LeadId = lead.Id,
                    Mesaj = "Multumesc! Am inregistrat informatiile. Un broker autorizat te va contacta pentru pasii urmatori. Nota: Rezultatele sunt estimative; aprobarea finala apartine creditorului."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eroare la procesarea lead next");
                return StatusCode(500, new { error = "eroare_server", code = ex.Message });
            }
        }

        private static string GetPromptForStep(int step)
        {
            return step switch
            {
                1 => "Care este numele si prenumele tau?",
                2 => "Care este numarul tau de telefon?",
                3 => "Care este adresa ta de email?",
                4 => "Ai credite active in acest moment? (DA/NU)",
                5 => "Ai intarzieri la plata ratelor? (DA/NU, daca DA cate zile: 30/60/90+)",
                6 => "Care este venitul tau net lunar? (ex: 5200)",
                7 => "In ce oras locuiesti?",
                8 => "Ai avut poprire sau executor in ultimii 5 ani? (DA/NU)",
                _ => "Multumesc!"
            };
        }

        private (LeadSession Session, string? Error) ProcessAnswer(LeadSession session, string answer)
        {
            var data = JsonSerializer.Deserialize<LeadSessionData>(session.SessionDataJson ?? "{}") ?? new LeadSessionData();
            answer = answer.Trim();

            switch (session.Step)
            {
                case 1:
                    if (answer.Length < 3) return (session, "Te rog scrie nume si prenume.");
                    data.NumePrenume = answer;
                    session.Step = 2;
                    break;
                case 2:
                    var cleaned = answer.Replace(" ", "");
                    if (cleaned.Length < 8) return (session, "Te rog scrie un numar de telefon valid.");
                    data.Telefon = answer;
                    session.Step = 3;
                    break;
                case 3:
                    if (!answer.Contains("@") || answer.Length < 6) return (session, "Te rog scrie un email valid.");
                    data.Email = answer;
                    session.Step = 4;
                    break;
                case 4:
                    var yn4 = ParseYesNo(answer);
                    if (yn4 == null) return (session, "Te rog raspunde cu DA sau NU.");
                    data.CrediteActive = yn4.Value;
                    session.Step = 5;
                    break;
                case 5:
                    var yn5 = ParseYesNo(answer);
                    if (yn5 != null)
                    {
                        data.Intarzieri = yn5.Value;
                        if (!yn5.Value) data.IntarzieriZileMax = 0;
                        session.Step = 6;
                        break;
                    }
                    var days = ParseDays(answer);
                    if (days.HasValue)
                    {
                        data.Intarzieri = true;
                        data.IntarzieriZileMax = days.Value;
                        session.Step = 6;
                        break;
                    }
                    return (session, "Te rog raspunde cu DA sau NU. Daca DA, poti adauga: 30/60/90+.");
                case 6:
                    var first = ExtractFirstNumber(answer);
                    if (first == null) return (session, "Te rog scrie venitul net lunar ca numar (ex: 5200).");
                    data.VenitNetLunar = first.Value;
                    var numbers = Regex.Matches(answer.Replace(".", ""), @"\d+").Cast<Match>().Select(m => decimal.Parse(m.Value)).ToList();
                    if (numbers.Count >= 2) data.BonuriMasaAprox = numbers[1];
                    session.Step = 7;
                    break;
                case 7:
                    if (answer.Length < 2) return (session, "Te rog scrie orasul.");
                    data.Oras = answer;
                    session.Step = 8;
                    break;
                case 8:
                    var yn8 = ParseYesNo(answer);
                    if (yn8 != null)
                    {
                        data.PoprireSauExecutorUltimii5Ani = yn8.Value;
                        if (!yn8.Value) data.SituatiePoprireInchisa = null;
                        session.Step = 9;
                        break;
                    }
                    var lower = answer.ToLower();
                    if (lower.StartsWith("da"))
                    {
                        data.PoprireSauExecutorUltimii5Ani = true;
                        if (lower.Contains("inchis") || lower.Contains("rezolvat")) data.SituatiePoprireInchisa = true;
                        else if (lower.Contains("activ") || lower.Contains("in derulare")) data.SituatiePoprireInchisa = false;
                        session.Step = 9;
                        break;
                    }
                    return (session, "Te rog raspunde cu DA sau NU. Daca DA, spune si 'inchisa' sau 'activa'.");
                default:
                    break;
            }

            session.SessionDataJson = JsonSerializer.Serialize(data);
            return (session, null);
        }

        private bool? ParseYesNo(string text)
        {
            var lower = text.ToLower().Trim();
            if (lower == "da" || lower == "d" || lower.StartsWith("da ") || lower == "yes") return true;
            if (lower == "nu" || lower == "n" || lower.StartsWith("nu ") || lower == "no") return false;
            return null;
        }

        private int? ParseDays(string text)
        {
            var lower = text.ToLower();
            if (lower.Contains("120") || lower.Contains("peste 90") || lower.Contains("90+") || lower.Contains("100")) return 120;
            if (lower.Contains("90")) return 90;
            if (lower.Contains("60")) return 60;
            if (lower.Contains("30")) return 30;
            return null;
        }

        private decimal? ExtractFirstNumber(string text)
        {
            var match = Regex.Match(text.Replace(".", ""), @"(\d{1,9})");
            if (match.Success && decimal.TryParse(match.Value, out var num)) return num;
            return null;
        }

        private LeadCaptureRequest? BuildLeadRequestFromSession(LeadSession session)
        {
            var data = JsonSerializer.Deserialize<LeadSessionData>(session.SessionDataJson ?? "{}");
            if (data == null) return null;

            if (string.IsNullOrEmpty(data.NumePrenume) || string.IsNullOrEmpty(data.Telefon) ||
                string.IsNullOrEmpty(data.Email) || string.IsNullOrEmpty(data.Oras) ||
                !data.VenitNetLunar.HasValue || !data.CrediteActive.HasValue ||
                !data.Intarzieri.HasValue || !data.PoprireSauExecutorUltimii5Ani.HasValue)
                return null;

            return new LeadCaptureRequest
            {
                NumePrenume = data.NumePrenume,
                Telefon = data.Telefon,
                Email = data.Email,
                Oras = data.Oras,
                CrediteActive = data.CrediteActive.Value,
                SoldTotalAprox = data.SoldTotalAprox,
                TipCreditor = data.TipCreditor,
                Intarzieri = data.Intarzieri.Value,
                IntarzieriNumarAprox = data.IntarzieriNumarAprox,
                IntarzieriZileMax = data.IntarzieriZileMax ?? 0,
                VenitNetLunar = data.VenitNetLunar.Value,
                BonuriMasaAprox = data.BonuriMasaAprox,
                PoprireSauExecutorUltimii5Ani = data.PoprireSauExecutorUltimii5Ani.Value,
                SituatiePoprireInchisa = data.SituatiePoprireInchisa
            };
        }
    }
}
