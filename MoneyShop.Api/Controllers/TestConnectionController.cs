using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.DomainModel.Entities;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestConnectionController : BaseController
    {
        private readonly MoneyShopDbContext _context;
        private readonly ILogger<TestConnectionController> _logger;
        private readonly IConfiguration _configuration;

        public TestConnectionController(
            MoneyShopDbContext context,
            ILogger<TestConnectionController> logger,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpGet]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                var connectionString = _configuration.GetConnectionString("DefaultConnection");
                var connectionStringPreview = connectionString?.Length > 50
                    ? connectionString.Substring(0, 50) + "..."
                    : connectionString;

                var canConnect = await _context.Database.CanConnectAsync();

                if (!canConnect)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Cannot connect to database",
                        connectionStringPreview
                    });
                }

                var databaseName = _context.Database.GetDbConnection().Database;
                var serverName = _context.Database.GetDbConnection().DataSource;

                var roleCount = await _context.Set<Roluri>().CountAsync();
                var userCount = await _context.Set<Utilizatori>().CountAsync();

                return Ok(new
                {
                    success = true,
                    message = "Database connection successful",
                    databaseName, serverName, roleCount, userCount, connectionStringPreview
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing database connection");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error testing database connection",
                    error = ex.Message,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace?.Split('\n').Take(5)
                });
            }
        }
    }
}
