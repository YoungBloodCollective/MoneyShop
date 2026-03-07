using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using System.Security.Claims;
using System.IO;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BrokerController : BaseController
    {
        private readonly IBrokerDirectoryService _brokerService;

        public BrokerController(IBrokerDirectoryService brokerService)
        {
            _brokerService = brokerService;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                throw new UnauthorizedAccessException("Invalid user");
            return userId;
        }

        [HttpPost("upload-excel")]
        [RequestSizeLimit(10_000_000)]
        public async Task<IActionResult> UploadExcel([FromForm] BrokerUploadModel model)
        {
            if (model == null || model.File == null)
                return BadRequest(new { message = "Excel file is required" });

            var extension = Path.GetExtension(model.File.FileName).ToLower();
            if (extension != ".xlsx" && extension != ".xls")
                return BadRequest(new { message = "Only Excel files (.xlsx, .xls) are allowed" });

            if (model.File.Length > 10_000_000)
                return BadRequest(new { message = "File size exceeds 10MB limit" });

            try
            {
                var userId = GetUserId();
                byte[] fileContent;
                using (var memoryStream = new MemoryStream())
                {
                    await model.File.CopyToAsync(memoryStream);
                    fileContent = memoryStream.ToArray();
                }

                var result = _brokerService.UploadExcelFile(userId, model.File.FileName, fileContent, model.Notes);

                return Ok(new
                {
                    directoryId = result.DirectoryId,
                    fileName = result.ExcelFileName,
                    uploadedAt = result.UploadedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("directory/latest")]
        public IActionResult GetLatestDirectory()
        {
            try
            {
                var directory = _brokerService.GetLatestDirectory();
                if (directory == null)
                    return NotFound(new { message = "No Excel file uploaded yet" });

                return Ok(new
                {
                    directoryId = directory.DirectoryId,
                    fileName = directory.ExcelFileName,
                    fileSize = directory.FileSize,
                    uploadedAt = directory.UploadedAt,
                    notes = directory.Notes
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("search")]
        public IActionResult SearchBrokers([FromQuery] string? search = null, [FromQuery] int? limit = null)
        {
            try
            {
                var brokers = _brokerService.SearchBrokers(search, limit);
                return Ok(new { brokers, count = brokers.Count });
            }
            catch (FileNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class BrokerUploadModel
    {
        public IFormFile File { get; set; } = null!;
        public string? Notes { get; set; }
    }
}
