using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Administrator,Broker")]
    public class CrmController : BaseController
    {
        private readonly ICrmDashboardService _dashboard;
        private readonly ICrmService _crm;

        public CrmController(ICrmDashboardService dashboard, ICrmService crm)
        {
            _dashboard = dashboard;
            _crm = crm;
        }

        [HttpGet("dashboard")]
        public IActionResult GetDashboard()
        {
            return Ok(_dashboard.GetSummary());
        }

        [HttpGet("clients")]
        public IActionResult GetClients()
        {
            return Ok(_crm.GetClients());
        }

        [HttpGet("clients/{userId:int}")]
        public IActionResult GetClient(int userId)
        {
            var client = _crm.GetClient(userId);
            if (client == null) return NotFound("Clientul nu a fost găsit");
            return Ok(client);
        }

        [HttpGet("files")]
        public IActionResult GetFiles()
        {
            return Ok(_crm.GetFiles());
        }

        [HttpGet("offers")]
        public IActionResult GetOffers()
        {
            return Ok(_crm.GetOffers());
        }
    }
}
