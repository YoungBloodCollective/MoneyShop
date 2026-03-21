using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.User;
using System.Security.Claims;
using System.Text.Json;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserFinancialDataController : BaseController
    {
        private readonly IUserFinancialDataService _financialDataService;

        public UserFinancialDataController(IUserFinancialDataService financialDataService)
        {
            _financialDataService = financialDataService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                throw new UnauthorizedAccessException("Invalid user");
            return userId;
        }

        [HttpGet("my-data")]
        public IActionResult GetMyFinancialData()
        {
            try
            {
                var userId = GetUserId();
                var data = _financialDataService.GetFinancialData(userId);

                if (data == null)
                    return Ok(new { isEmpty = true });

                object? credits = null;
                if (!string.IsNullOrEmpty(data.CreditsJson))
                {
                    try
                    {
                        credits = JsonSerializer.Deserialize<List<CreditEntryDto>>(data.CreditsJson, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });
                    }
                    catch { credits = null; }
                }

                return Ok(new
                {
                    isEmpty = false,
                    ficoScore = data.FicoScore,
                    salariu1 = data.Salariu1,
                    salariu2 = data.Salariu2,
                    salariu3 = data.Salariu3,
                    salariuNet = data.SalariuNet,
                    bonuriMasa = data.BonuriMasa,
                    sumaBonuriMasa = data.SumaBonuriMasa,
                    venitTotal = data.VenitTotal,
                    credits = credits ?? new List<CreditEntryDto>(),
                    soldTotal = data.SoldTotal,
                    rataTotalaLunara = data.RataTotalaLunara,
                    nrCrediteBanci = data.NrCrediteBanci,
                    nrIfn = data.NrIfn,
                    poprire = data.Poprire,
                    intarzieri = data.Intarzieri,
                    intarzieriNumar = data.IntarzieriNumar,
                    dti = data.Dti,
                    scoringLevel = data.ScoringLevel,
                    recommendedLevel = data.RecommendedLevel,
                    lastUpdated = data.LastUpdated
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("my-data")]
        public IActionResult SaveMyFinancialData([FromBody] ManualFinancialDataDto dto)
        {
            try
            {
                var userId = GetUserId();
                var result = _financialDataService.SaveManualFinancialData(userId, dto);

                return Ok(new
                {
                    message = "Date financiare salvate cu succes",
                    salariuNet = result.SalariuNet,
                    venitTotal = result.VenitTotal,
                    soldTotal = result.SoldTotal,
                    rataTotalaLunara = result.RataTotalaLunara,
                    dti = result.Dti,
                    scoringLevel = result.ScoringLevel,
                    lastUpdated = result.LastUpdated
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
