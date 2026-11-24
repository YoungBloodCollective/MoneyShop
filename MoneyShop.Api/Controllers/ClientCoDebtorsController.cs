using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Audit;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers;

[ApiController]
[Route("api/crm/clients/{clientUserId:int}/codebitori")]
[Authorize(Roles = "Administrator,Broker")]
public class ClientCoDebtorsController : BaseController
{
    private const string NotVisible = "Clientul nu există sau nu îți este atribuit.";

    private readonly IClientCoDebtorService _coDebtors;
    private readonly ICrmService _crm;
    private readonly IAuditService _audit;

    public ClientCoDebtorsController(IClientCoDebtorService coDebtors, ICrmService crm, IAuditService audit)
    {
        _coDebtors = coDebtors;
        _crm = crm;
        _audit = audit;
    }

    [HttpGet]
    public IActionResult Get(int clientUserId)
    {
        if (!_crm.IsClientVisible(clientUserId)) return NotFound(NotVisible);
        return Ok(_coDebtors.Get(clientUserId));
    }

    [HttpGet("candidates")]
    public IActionResult Candidates(int clientUserId, [FromQuery] string? q)
    {
        if (!_crm.IsClientVisible(clientUserId)) return NotFound(NotVisible);
        return Ok(_coDebtors.SearchCandidates(clientUserId, q));
    }

    [HttpPost]
    public async Task<IActionResult> Add(int clientUserId, [FromBody] CoDebtorCreateInput input)
    {
        if (!_crm.IsClientVisible(clientUserId)) return NotFound(NotVisible);
        var result = await _coDebtors.AddAsync(clientUserId, input ?? new CoDebtorCreateInput());
        switch (result.Error)
        {
            case CoDebtorError.None:
                _audit.Log("ClientCoDebtor", result.Item!.Id.ToString(), "created", null, new { ClientUserId = clientUserId, CoDebtorUserId = result.Item.UserId, result.Item.Relation });
                return Ok(result.Item);
            case CoDebtorError.ClientNotVisible: return NotFound(NotVisible);
            case CoDebtorError.InvalidRelation: return BadRequest("Alege relația dintre cei doi clienți.");
            case CoDebtorError.Self: return BadRequest("Un client nu poate fi codebitorul propriului dosar.");
            case CoDebtorError.NoAcord: return BadRequest("Clientul ales nu a fost găsit sau nu a semnat încă acordul.");
            case CoDebtorError.DifferentBroker: return BadRequest("Cei doi clienți aparțin unor brokeri diferiți.");
            case CoDebtorError.Duplicate: return Conflict("Cei doi clienți sunt deja legați ca codebitori.");
            default: return BadRequest("Cererea nu este validă.");
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Remove(int clientUserId, int id)
    {
        if (!_crm.IsClientVisible(clientUserId)) return NotFound(NotVisible);
        if (!await _coDebtors.RemoveAsync(clientUserId, id)) return NotFound("Legătura nu există.");
        _audit.Log("ClientCoDebtor", id.ToString(), "deleted", new { ClientUserId = clientUserId });
        return Ok(new { removed = true });
    }
}
