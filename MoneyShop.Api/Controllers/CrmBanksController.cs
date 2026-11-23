using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers
{
    /// <summary>
    /// The bank catalog (edited by the Super Admin, read by brokers for the bank-file form), each
    /// broker's own commissions per bank and the monthly bank numbers with the network thresholds.
    /// </summary>
    [ApiController]
    [Route("api/crm")]
    [Authorize(Roles = "Administrator,Broker")]
    public class CrmBanksController : BaseController
    {
        private readonly IBankCatalogService _banks;

        public CrmBanksController(IBankCatalogService banks)
        {
            _banks = banks;
        }

        private int UserId => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

        [HttpGet("banks")]
        public IActionResult GetActiveBanks() => Ok(_banks.GetActiveBanks());

        [HttpGet("banks/all")]
        [Authorize(Roles = "Administrator")]
        public IActionResult GetAllBanks() => Ok(_banks.GetAllBanks());

        [HttpPost("banks")]
        [Authorize(Roles = "Administrator")]
        public IActionResult CreateBank([FromBody] BankCatalogInput input)
        {
            try { return Ok(_banks.CreateBank(input), "Banca a fost adăugată"); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("banks/{bankId:int}")]
        [Authorize(Roles = "Administrator")]
        public IActionResult UpdateBank(int bankId, [FromBody] BankCatalogInput input)
        {
            try
            {
                var bank = _banks.UpdateBank(bankId, input);
                return bank == null ? NotFound("Banca nu există.") : Ok(bank, "Banca a fost actualizată");
            }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("commissions/mine")]
        public IActionResult GetMyCommissions() => Ok(_banks.GetMyCommissions(UserId));

        public class CommissionInput
        {
            public decimal? Percent { get; set; }
        }

        [HttpPut("commissions/mine/{bankId:int}")]
        public IActionResult SetMyCommission(int bankId, [FromBody] CommissionInput input)
        {
            try
            {
                var item = _banks.SetMyCommission(UserId, bankId, input.Percent);
                return item == null ? NotFound("Banca nu există sau nu este activă.") : Ok(item, "Comision salvat");
            }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("bank-stats")]
        public IActionResult GetStats([FromQuery] string? month)
        {
            try { return Ok(_banks.GetStats(UserId, month, User.IsInRole("Administrator"))); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }
    }
}
