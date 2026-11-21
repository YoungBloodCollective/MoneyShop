using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers;

/// <summary>The "Istoric" card on the CRM client file.</summary>
[ApiController]
[Route("api/crm/clients")]
[Authorize(Roles = "Administrator,Broker")]
public class ClientTimelineController : BaseController
{
    private readonly ICrmService _crm;
    private readonly IClientTimelineService _timeline;

    public ClientTimelineController(ICrmService crm, IClientTimelineService timeline)
    {
        _crm = crm;
        _timeline = timeline;
    }

    [HttpGet("{userId:int}/timeline")]
    public async Task<IActionResult> Get(int userId)
    {
        if (!_crm.IsClientVisible(userId))
            return NotFound("Clientul nu există sau nu îți este atribuit.");
        return Ok(await _timeline.GetAsync(userId));
    }
}
