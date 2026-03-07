using Microsoft.AspNetCore.Mvc;
using Microsoft.ApplicationInsights;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TelemetryController : BaseController
    {
        private readonly TelemetryClient _telemetryClient;
        private readonly ILogger<TelemetryController> _logger;

        public TelemetryController(TelemetryClient telemetryClient, ILogger<TelemetryController> logger)
        {
            _telemetryClient = telemetryClient;
            _logger = logger;
        }

        [HttpPost("track-event")]
        public IActionResult TrackEvent([FromBody] TrackEventRequest request)
        {
            try
            {
                var properties = new Dictionary<string, string>();
                if (request.Properties != null)
                {
                    foreach (var prop in request.Properties)
                        properties[prop.Key] = prop.Value?.ToString() ?? string.Empty;
                }

                properties["Source"] = "Frontend";
                properties["UserAgent"] = HttpContext.Request.Headers["User-Agent"].ToString();
                properties["IP"] = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

                _telemetryClient.TrackEvent(request.EventName, properties);
                _logger.LogInformation("Custom event tracked from frontend: {EventName}", request.EventName);

                return Ok(new { success = true, message = "Event tracked" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error tracking event from frontend");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("track-exception")]
        public IActionResult TrackException([FromBody] TrackExceptionRequest request)
        {
            try
            {
                var properties = new Dictionary<string, string>();
                if (request.Properties != null)
                {
                    foreach (var prop in request.Properties)
                        properties[prop.Key] = prop.Value?.ToString() ?? string.Empty;
                }

                properties["Source"] = "Frontend";
                properties["UserAgent"] = HttpContext.Request.Headers["User-Agent"].ToString();
                properties["IP"] = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

                var exception = new Exception(request.ErrorMessage);
                _telemetryClient.TrackException(exception, properties);
                _logger.LogWarning("Exception tracked from frontend: {ErrorMessage}", request.ErrorMessage);

                return Ok(new { success = true, message = "Exception tracked" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error tracking exception from frontend");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    public class TrackEventRequest
    {
        public string EventName { get; set; } = null!;
        public Dictionary<string, object>? Properties { get; set; }
        public string? Timestamp { get; set; }
    }

    public class TrackExceptionRequest
    {
        public string ErrorMessage { get; set; } = null!;
        public string? ErrorStack { get; set; }
        public Dictionary<string, object>? Properties { get; set; }
        public string? Timestamp { get; set; }
    }
}
