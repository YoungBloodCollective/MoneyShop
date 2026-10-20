using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Broker;

namespace MoneyShop.Api.Controllers;

[ApiController]
public class BrokersController : BaseController
{
    private readonly IBrokerProfileService _brokerProfiles;

    public BrokersController(IBrokerProfileService brokerProfiles)
    {
        _brokerProfiles = brokerProfiles;
    }

    private int CurrentUserId =>
        int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

    [HttpGet("/api/public/brokers/{slug}")]
    public IActionResult GetPublic(string slug)
    {
        var profile = _brokerProfiles.GetPublicProfile(slug);
        return profile == null ? NotFound("Brokerul nu a fost gasit") : Ok(profile);
    }

    [HttpGet("/api/brokers/me")]
    [Authorize(Roles = "Broker")]
    public IActionResult GetOwn()
    {
        var profile = _brokerProfiles.GetForUser(CurrentUserId);
        return profile == null ? NotFound("Profilul de broker nu a fost gasit") : Ok(profile);
    }

    [HttpPut("/api/brokers/me")]
    [Authorize(Roles = "Broker")]
    public IActionResult UpdateOwn([FromBody] BrokerSelfUpdateInput input)
    {
        var result = _brokerProfiles.UpdateOwn(CurrentUserId, input ?? new BrokerSelfUpdateInput());
        return result.Success ? Ok(_brokerProfiles.GetForUser(CurrentUserId)) : BadRequest(result.Error);
    }

    [HttpGet("/api/brokers")]
    [Authorize(Roles = "Administrator")]
    public IActionResult List() => Ok(_brokerProfiles.ListForAdmin());

    [HttpGet("/api/brokers/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public IActionResult Get(int id)
    {
        var profile = _brokerProfiles.GetForAdmin(id);
        return profile == null ? NotFound("Brokerul nu a fost gasit") : Ok(profile);
    }

    [HttpPost("/api/brokers")]
    [Authorize(Roles = "Administrator")]
    public IActionResult Create([FromBody] BrokerCreateInput input)
    {
        if (input == null) return BadRequest("Date lipsa");
        var result = _brokerProfiles.Create(input);
        return result.Success ? Ok(_brokerProfiles.GetForAdmin(result.Id!.Value)) : BadRequest(result.Error);
    }

    [HttpPut("/api/brokers/{id:int}")]
    [Authorize(Roles = "Administrator")]
    public IActionResult Update(int id, [FromBody] BrokerAdminUpdateInput input)
    {
        var result = _brokerProfiles.Update(id, input ?? new BrokerAdminUpdateInput());
        return result.Success ? Ok(_brokerProfiles.GetForAdmin(id)) : BadRequest(result.Error);
    }

    [HttpPost("/api/brokers/{id:int}/password")]
    [Authorize(Roles = "Administrator")]
    public IActionResult SetPassword(int id, [FromBody] BrokerPasswordRequest request)
    {
        var result = _brokerProfiles.SetPassword(id, request?.Password ?? string.Empty);
        return result.Success ? Ok(new { success = true }) : BadRequest(result.Error);
    }
}

public class BrokerPasswordRequest
{
    public string Password { get; set; } = null!;
}
