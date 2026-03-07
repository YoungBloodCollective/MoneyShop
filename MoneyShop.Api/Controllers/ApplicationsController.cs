using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Application;
using MoneyShop.DomainModel.Entities;
using System.Security.Claims;
using ApplicationEntity = MoneyShop.DomainModel.Entities.Application;
using Microsoft.ApplicationInsights;
using Microsoft.ApplicationInsights.DataContracts;

namespace MoneyShop.Api.Controllers
{
    public class CreateApplicationRequest
    {
        public string? TypeCredit { get; set; }
        public string? TipOperatiune { get; set; }
        public decimal? RequestedAmount { get; set; }
        public int? RequestedTermMonths { get; set; }
        public string? Purpose { get; set; }
    }

    public class UpdateApplicationRequest
    {
        public int Id { get; set; }
        public string? TypeCredit { get; set; }
        public string? TipOperatiune { get; set; }
        public string? Status { get; set; }
        public decimal? RequestedAmount { get; set; }
        public int? RequestedTermMonths { get; set; }
        public string? Purpose { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ApplicationsController : BaseController
    {
        private readonly IApplicationService _applicationService;
        private readonly TelemetryClient _telemetryClient;
        private readonly ILogger<ApplicationsController> _logger;

        public ApplicationsController(IApplicationService applicationService, TelemetryClient telemetryClient, ILogger<ApplicationsController> logger)
        {
            _applicationService = applicationService;
            _telemetryClient = telemetryClient;
            _logger = logger;
        }

        [HttpGet]
        public IActionResult GetApplications()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var applications = _applicationService.GetUserApplications(userId.Value);
            return Ok(applications);
        }

        [HttpGet("{id}")]
        public IActionResult GetApplication(int id)
        {
            var application = _applicationService.GetApplicationById(id);
            if (application == null) return NotFound("Application not found");

            var userId = GetCurrentUserId();
            if (application.UserId != userId) return Forbid();

            return Ok(application);
        }

        [HttpPost]
        public IActionResult CreateApplication([FromBody] CreateApplicationRequest request)
        {
            var startTime = DateTime.UtcNow;
            var requestTelemetry = HttpContext.Features.Get<RequestTelemetry>();

            try
            {
                if (request == null)
                {
                    _logger.LogWarning("Application creation failed: Invalid application data");
                    return BadRequest("Invalid application data");
                }

                var userId = GetCurrentUserId();
                if (userId == null) return Unauthorized();

                var existingApplications = _applicationService.GetUserApplications(userId.Value);
                if (existingApplications.Any(a => a.TypeCredit == request.TypeCredit &&
                                                   a.Status == "INREGISTRAT" &&
                                                   a.TipOperatiune == request.TipOperatiune))
                {
                    _logger.LogWarning("Application creation failed: Duplicate for user {UserId}, TypeCredit={TypeCredit}",
                        userId.Value, request.TypeCredit);
                    return Conflict("An application of this type already exists");
                }

                var application = new ApplicationEntity
                {
                    UserId = userId.Value,
                    TypeCredit = request.TypeCredit,
                    TipOperatiune = request.TipOperatiune,
                    RequestedAmount = request.RequestedAmount,
                    RequestedTermMonths = request.RequestedTermMonths,
                    Purpose = request.Purpose,
                    Status = "INREGISTRAT",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var created = _applicationService.CreateApplication(application);

                _telemetryClient.TrackEvent("ApplicationSuccessfullyAdded", new Dictionary<string, string>
                {
                    { "ApplicationId", created.Id.ToString() },
                    { "UserId", userId.Value.ToString() },
                    { "TypeCredit", created.TypeCredit ?? "N/A" },
                    { "Status", created.Status }
                });
                _logger.LogInformation("Application successfully added: ID={ApplicationId}, UserId={UserId}, TypeCredit={TypeCredit}",
                    created.Id, userId.Value, created.TypeCredit);

                if (requestTelemetry != null)
                {
                    requestTelemetry.Properties.Add("ApplicationId", created.Id.ToString());
                    requestTelemetry.Properties.Add("TypeCredit", created.TypeCredit ?? "N/A");
                }

                return Created(created);
            }
            catch (Exception ex)
            {
                _telemetryClient.TrackException(ex, new Dictionary<string, string>
                {
                    { "Endpoint", "/api/applications" },
                    { "ErrorType", "CreateApplicationException" }
                });
                _logger.LogError(ex, "Error creating application: {Message}", ex.Message);
                return InternalServerError("An error occurred while creating the application");
            }
        }

        [HttpPut("{id}")]
        public IActionResult UpdateApplication(int id, [FromBody] UpdateApplicationRequest request)
        {
            if (request == null || request.Id != id) return BadRequest("Invalid request");

            var existing = _applicationService.GetApplicationById(id);
            if (existing == null) return NotFound("Application not found");

            var userId = GetCurrentUserId();
            if (existing.UserId != userId) return Forbid();

            // Update only the fields that can be changed
            existing.TypeCredit = request.TypeCredit ?? existing.TypeCredit;
            existing.TipOperatiune = request.TipOperatiune ?? existing.TipOperatiune;
            existing.RequestedAmount = request.RequestedAmount ?? existing.RequestedAmount;
            existing.RequestedTermMonths = request.RequestedTermMonths ?? existing.RequestedTermMonths;
            existing.Purpose = request.Purpose ?? existing.Purpose;
            existing.Status = request.Status ?? existing.Status;
            existing.UpdatedAt = DateTime.UtcNow;

            var updated = _applicationService.UpdateApplication(existing);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteApplication(int id)
        {
            var application = _applicationService.GetApplicationById(id);
            if (application == null) return NotFound("Application not found");

            var userId = GetCurrentUserId();
            if (application.UserId != userId) return Forbid();

            _applicationService.DeleteApplication(id);
            return NoContent();
        }

        [HttpGet("{id}/status")]
        public IActionResult GetApplicationStatus(int id)
        {
            var application = _applicationService.GetApplicationById(id);
            if (application == null) return NotFound("Application not found");

            var userId = GetCurrentUserId();
            if (application.UserId != userId) return Forbid();

            return Ok(new { status = application.Status });
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return null;
            return userId;
        }
    }
}
