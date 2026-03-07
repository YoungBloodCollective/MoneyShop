using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Bank;
using BankEntity = MoneyShop.DomainModel.Entities.Bank;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BanksController : BaseController
    {
        private readonly IBankService _bankService;

        public BanksController(IBankService bankService)
        {
            _bankService = bankService;
        }

        [HttpGet]
        public IActionResult GetBanks()
        {
            var banks = _bankService.GetAllBanks();
            return Ok(banks);
        }

        [HttpGet("{id}")]
        public IActionResult GetBank(int id)
        {
            var bank = _bankService.GetBankById(id);
            if (bank == null)
                return NotFound(new { message = "Bank not found" });

            return Ok(bank);
        }
    }
}
