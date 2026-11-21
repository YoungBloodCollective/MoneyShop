using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceAdapters.Services.Otp;
using MoneyShop.ServiceInterface.Interfaces.Assignment;
using MoneyShop.ServiceInterface.Interfaces.Broker;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// Super Admin inbox and lead distribution (see <see cref="IAssignmentService"/>). Assigning a
/// request emails the broker who now owns it.
/// </summary>
[ApiController]
[Route("api/assignments")]
[Authorize(Roles = "Administrator")]
public class AssignmentsController : BaseController
{
    private readonly IAssignmentService _assignments;
    private readonly EmailService _email;
    private readonly IBrokerProfileService _brokerProfiles;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AssignmentsController> _logger;

    public AssignmentsController(IAssignmentService assignments, EmailService email, IBrokerProfileService brokerProfiles,
        IConfiguration configuration, ILogger<AssignmentsController> logger)
    {
        _assignments = assignments;
        _email = email;
        _brokerProfiles = brokerProfiles;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>Requests with no broker yet (appointments, leads, acords), newest first.</summary>
    [HttpGet("inbox")]
    public async Task<IActionResult> Inbox() => Ok(await _assignments.GetInboxAsync());

    /// <summary>Assigns, transfers or (with a null broker) returns a request to the inbox.</summary>
    [HttpPost]
    public async Task<IActionResult> Assign([FromBody] AssignInput request)
    {
        var actor = new AssignActor(
            int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : null,
            User.FindFirst(ClaimTypes.Role)?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString());

        var outcome = await _assignments.AssignAsync(request, actor);
        switch (outcome.Error)
        {
            case AssignError.InvalidType: return BadRequest("Tip necunoscut. Folosește appointment, lead sau acord.");
            case AssignError.InvalidId: return BadRequest("Id invalid.");
            case AssignError.NotFound: return NotFound("Cererea nu există.");
            case AssignError.BrokerNotFound: return BadRequest("Brokerul nu există.");
            case AssignError.BrokerInactive: return BadRequest("Brokerul nu este activ.");
        }

        _logger.LogInformation("{Action} {Type} {Id}: broker {Old} -> {New}",
            outcome.Action, outcome.EntityType, outcome.Id, outcome.FromBrokerProfileId, outcome.ToBrokerProfileId);

        if (outcome.ToBrokerProfileId.HasValue && outcome.Action is "assign" or "transfer")
        {
            var to = _brokerProfiles.GetNotificationEmail(outcome.ToBrokerProfileId);
            if (!string.IsNullOrWhiteSpace(to))
            {
                var root = _configuration["Brokers:RootDomain"] ?? "moneyshop.ro";
                var kind = outcome.EntityType switch
                {
                    AssignableTypes.Appointment => "Programare",
                    AssignableTypes.Lead => "Lead",
                    _ => "Acord",
                };
                _ = _email.SendAssignmentNotificationAsync(to, kind, outcome.ClientName, outcome.ClientPhone, $"https://{root}{outcome.CrmPath}");
            }
        }

        return Ok(new
        {
            outcome.EntityType,
            outcome.Id,
            outcome.FromBrokerProfileId,
            outcome.ToBrokerProfileId,
            outcome.Action,
        });
    }

    /// <summary>Assignment history of one request: who moved it, when and why.</summary>
    [HttpGet("history/{entityType}/{id}")]
    public async Task<IActionResult> History(string entityType, string id) =>
        Ok(await _assignments.GetHistoryAsync(entityType, id));
}
