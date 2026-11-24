using System;
using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.Infrastructure.EntityFramework.ApiResponse;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.Api.Controllers
{
    /// <summary>
    /// The monthly commission report (PDF or Excel). A broker gets their own; only the Super Admin may
    /// pass a brokerId.
    /// </summary>
    [ApiController]
    [Route("api/crm/reports")]
    [Authorize(Roles = "Administrator,Broker")]
    public class CrmReportsController : BaseController
    {
        private readonly ICommissionReportService _reports;

        public CrmReportsController(ICommissionReportService reports)
        {
            _reports = reports;
        }

        private int UserId => int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

        [HttpGet("commission")]
        public IActionResult GetCommissionReport([FromQuery] string? month, [FromQuery] string format = "pdf", [FromQuery] int? brokerId = null)
        {
            try
            {
                var file = _reports.Generate(UserId, User.IsInRole("Administrator"), month, brokerId, format);
                return File(file.Content, file.ContentType, file.FileName);
            }
            catch (UnauthorizedAccessException ex) { return StatusCode(403, new ApiResponse(HttpStatusCode.Forbidden, ex.Message)); }
            catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
        }
    }
}
