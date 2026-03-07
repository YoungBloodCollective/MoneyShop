using Microsoft.AspNetCore.Mvc;
using Microsoft.ApplicationInsights;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : BaseController
    {
        private readonly TelemetryClient _telemetryClient;
        private readonly ILogger<HealthController> _logger;

        public HealthController(TelemetryClient telemetryClient, ILogger<HealthController> logger)
        {
            _telemetryClient = telemetryClient;
            _logger = logger;
        }

        [HttpGet]
        [HttpGet("ping")]
        public IActionResult Health()
        {
            _telemetryClient.TrackMetric("HealthCheck", 1);
            _logger.LogInformation("Health check endpoint called at {Time}", DateTime.UtcNow);

            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                version = "1.0.0"
            });
        }
    }
}
