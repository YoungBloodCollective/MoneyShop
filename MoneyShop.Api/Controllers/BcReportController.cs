using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Audit;
using MoneyShop.ServiceInterface.Interfaces.BcReport;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BcReportController : BaseController
{
    private readonly IBcReportService _bcReportService;
    private readonly IAuditService _audit;

    public BcReportController(IBcReportService bcReportService, IAuditService audit)
    {
        _bcReportService = bcReportService;
        _audit = audit;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            throw new UnauthorizedAccessException("Invalid user");
        return userId;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30_000_000)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        if (!file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only PDF files are accepted");

        try
        {
            var userId = GetUserId();
            var result = await _bcReportService.UploadAndParseAsync(file, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return InternalServerError(ex.Message);
        }
    }

    [HttpGet("latest")]
    public IActionResult GetLatest()
    {
        try
        {
            var userId = GetUserId();
            var report = _bcReportService.GetLatest(userId);

            if (report == null)
                return Ok(new { isEmpty = true });

            _audit.Log("BcReport", "latest", "file_read", newValue: new { ownerUserId = userId }, reason: "get_latest");

            return Ok(report);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{id:int}")]
    public IActionResult GetById(int id)
    {
        try
        {
            var report = _bcReportService.GetById(id, GetUserId());
            if (report == null)
                return NotFound("Report not found");

            _audit.Log("BcReport", id.ToString(), "file_read");

            return Ok(report);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
