using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Eligibility;
using MoneyShop.ServiceInterface.Dtos.Eligibility;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EligibilityController : BaseController
    {
        private readonly ISimpleEligibilityEngine _simpleEngine;
        private readonly IEligibilityConfigService _configService;

        public EligibilityController(
            ISimpleEligibilityEngine simpleEngine,
            IEligibilityConfigService configService)
        {
            _simpleEngine = simpleEngine;
            _configService = configService;
        }

        [HttpPost("simple")]
        [AllowAnonymous]
        public async Task<IActionResult> CalculateSimple([FromBody] CalcSimpleRequest request)
        {
            if (request == null)
                return BadRequest(new { message = "Invalid request data" });

            if (string.IsNullOrEmpty(request.LoanType) ||
                (request.LoanType != "NP" && request.LoanType != "IPOTECAR"))
                return BadRequest(new { message = "LoanType must be 'NP' or 'IPOTECAR'" });

            if (request.SalaryNetUser <= 0)
                return BadRequest(new { message = "SalaryNetUser must be greater than 0" });

            try
            {
                var result = await _simpleEngine.CalculateAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("verified")]
        [Authorize]
        public async Task<IActionResult> CalculateVerified([FromBody] CalcVerifiedRequest request)
        {
            return StatusCode(501, new { message = "Verified eligibility calculator not yet implemented" });
        }

        [HttpGet("config")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetConfig()
        {
            try
            {
                var config = await _configService.GetActiveConfigAsync();
                return Ok(config);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
