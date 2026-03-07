using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Simulator;
using MoneyShop.ServiceInterface.Interfaces.User;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SimulatorController : BaseController
    {
        private readonly IScoringService _scoringService;
        private readonly IUserFinancialDataService _financialDataService;

        public SimulatorController(IScoringService scoringService, IUserFinancialDataService financialDataService)
        {
            _scoringService = scoringService;
            _financialDataService = financialDataService;
        }

        private int? GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return null;
            return userId;
        }

        [HttpPost("calculate")]
        public IActionResult CalculateScoring([FromBody] ScoringRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Invalid request data" });

            try
            {
                var result = _scoringService.CalculateScoring(request);

                var userId = GetUserId();
                if (userId.HasValue)
                    _financialDataService.SaveFinancialData(userId.Value, request, result);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
