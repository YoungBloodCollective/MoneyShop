using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Credius;

namespace MoneyShop.Api.Controllers
{
    public class CrediusForwardRequest
    {
        public int ApplicationId { get; set; }
        /// <summary>Must be true: the client has agreed their data may be sent to Credius.</summary>
        public bool Consent { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Administrator,Broker")]
    public class CrediusController : BaseController
    {
        private readonly ICrediusService _credius;
        private readonly IApplicationRepository _applications;
        private readonly MoneyShopDbContext _context;
        private readonly ILogger<CrediusController> _logger;

        public CrediusController(
            ICrediusService credius,
            IApplicationRepository applications,
            MoneyShopDbContext context,
            ILogger<CrediusController> logger)
        {
            _credius = credius;
            _applications = applications;
            _context = context;
            _logger = logger;
        }

        [HttpGet("status")]
        public IActionResult Status() => Ok(new { configured = _credius.IsConfigured });

        [HttpPost("forward")]
        public async Task<IActionResult> Forward([FromBody] CrediusForwardRequest request)
        {
            // Consent gate: we never forward a client's data to Credius without their agreement.
            if (!request.Consent)
                return BadRequest("Consimțământul clientului este obligatoriu înainte de a trimite datele către Credius.");

            // Scoped lookup — the repository carries the broker filter, so a broker can only
            // forward their own clients.
            var app = _applications.Get().FirstOrDefault(a => a.Id == request.ApplicationId);
            if (app == null) return NotFound("Dosarul nu a fost găsit.");

            var user = _context.Utilizatoris.FirstOrDefault(u => u.IdUtilizator == app.UserId);

            var input = new CrediusLeadInput
            {
                Nume = user?.Nume ?? "",
                Prenume = user?.Prenume,
                Telefon = user?.NumarTelefon,
                Email = user?.Mail,
                SumaSolicitata = app.RequestedAmount,
                TipCredit = app.TypeCredit,
                PartnerReference = $"MS-{app.Id}"
            };

            _logger.LogInformation("Credius forward requested for application {AppId} with consent", app.Id);

            var result = await _credius.ForwardLeadAsync(input);
            return Ok(result);
        }
    }
}
