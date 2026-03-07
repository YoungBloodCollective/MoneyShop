using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using System.Data;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DatabaseTestController : BaseController
    {
        private readonly MoneyShopDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DatabaseTestController> _logger;

        public DatabaseTestController(
            MoneyShopDbContext context,
            IConfiguration configuration,
            ILogger<DatabaseTestController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpGet("test")]
        public async Task<IActionResult> TestConnection()
        {
            var result = new
            {
                timestamp = DateTime.UtcNow,
                connectionString = new
                {
                    server = "moneyshop.database.windows.net",
                    database = "moneyshop",
                    user = "alexmoore",
                    hasPassword = !string.IsNullOrEmpty(_configuration.GetConnectionString("DefaultConnection"))
                },
                tests = new List<object>()
            };

            var tests = new List<object>();

            try
            {
                var canConnect = await _context.Database.CanConnectAsync();
                tests.Add(new { test = "CanConnect", success = canConnect, message = canConnect ? "Connection successful" : "Cannot connect to database" });
            }
            catch (Exception ex)
            {
                tests.Add(new { test = "CanConnect", success = false, message = ex.Message, errorType = ex.GetType().Name, innerException = ex.InnerException?.Message });
            }

            try
            {
                var dbName = await _context.Database.ExecuteSqlRawAsync("SELECT DB_NAME()");
                tests.Add(new { test = "QueryDatabase", success = true, message = "Query executed successfully" });
            }
            catch (Exception ex)
            {
                tests.Add(new { test = "QueryDatabase", success = false, message = ex.Message, errorType = ex.GetType().Name });
            }

            try
            {
                var tableCount = await _context.Database.ExecuteSqlRawAsync(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
                tests.Add(new { test = "CheckTables", success = true, message = "Tables check completed" });
            }
            catch (Exception ex)
            {
                tests.Add(new { test = "CheckTables", success = false, message = ex.Message });
            }

            return Ok(new { result.timestamp, result.connectionString, tests });
        }
    }
}
