using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Kyc;
using System.Security.Claims;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class KycController : BaseController
    {
        private readonly IKycService _kycService;
        private readonly IWebHostEnvironment _environment;
        private readonly IConfiguration _configuration;
        private readonly IKycSessionRepository _kycSessionRepository;

        public KycController(
            IKycService kycService,
            IWebHostEnvironment environment,
            IConfiguration configuration,
            IKycSessionRepository kycSessionRepository)
        {
            _kycService = kycService;
            _environment = environment;
            _configuration = configuration;
            _kycSessionRepository = kycSessionRepository;
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                throw new UnauthorizedAccessException("Invalid user");
            return userId;
        }

        [HttpPost("start")]
        public IActionResult StartKycSession([FromBody] KycStartModel? model)
        {
            try
            {
                var userId = GetUserId();
                var kycType = model?.KycType ?? "USER_KYC";
                var result = _kycService.StartKycSession(userId, kycType);

                return Ok(new
                {
                    kycId = result.KycId,
                    status = result.Status,
                    createdAt = result.CreatedAt,
                    expiresAt = result.ExpiresAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("upload")]
        [RequestSizeLimit(10_000_000)]
        public async Task<IActionResult> UploadKycFile([FromForm] KycUploadModel model)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .Select(x => new { Field = x.Key, Errors = x.Value?.Errors.Select(e => e.ErrorMessage) })
                    .ToList();
                return BadRequest(new { message = "Invalid model data", errors });
            }

            if (model == null || model.File == null)
                return BadRequest(new { message = "File is required" });

            if (string.IsNullOrEmpty(model.FileType))
                return BadRequest(new { message = "FileType is required" });

            if (model.KycId == Guid.Empty)
                return BadRequest(new { message = "KycId is required" });

            try
            {
                var userId = GetUserId();

                var allowedTypes = new[] { "selfie", "id_front", "id_back", "proof_of_address" };
                if (!allowedTypes.Contains(model.FileType.ToLower()))
                    return BadRequest(new { message = $"Invalid file type. Allowed: {string.Join(", ", allowedTypes)}" });

                if (model.File.Length > 10_000_000)
                    return BadRequest(new { message = "File size exceeds 10MB limit" });

                byte[] fileContent;
                using (var memoryStream = new MemoryStream())
                {
                    await model.File.CopyToAsync(memoryStream);
                    fileContent = memoryStream.ToArray();
                }

                var result = _kycService.AddKycFile(
                    model.KycId, userId, model.FileType, null,
                    model.File.FileName, model.File.ContentType ?? "application/octet-stream",
                    model.File.Length, fileContent);

                return Ok(new
                {
                    fileId = result.FileId,
                    fileType = result.FileType,
                    blobPath = result.BlobPath,
                    createdAt = result.CreatedAt,
                    expiresAt = result.ExpiresAt
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var errorDetails = new
                {
                    message = ex.Message,
                    type = ex.GetType().Name,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                };
                return BadRequest(errorDetails);
            }
        }

        [HttpGet("status")]
        public IActionResult GetKycStatus([FromQuery] string? kycType)
        {
            try
            {
                var userId = GetUserId();
                var result = _kycService.GetKycStatus(userId, kycType ?? "USER_KYC");

                if (result == null)
                    return NotFound(new { message = "No KYC session found" });

                var session = _kycSessionRepository.Get().FirstOrDefault(k => k.KycId == result.KycId);

                return Ok(new
                {
                    kycId = result.KycId,
                    status = result.Status,
                    createdAt = result.CreatedAt,
                    verifiedAt = result.VerifiedAt,
                    expiresAt = result.ExpiresAt,
                    rejectionReason = result.RejectionReason,
                    files = result.Files,
                    cnp = session?.Cnp,
                    address = session?.Address,
                    city = session?.City,
                    county = session?.County,
                    postalCode = session?.PostalCode
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Administrator")]
        public IActionResult GetAllPendingKyc()
        {
            try
            {
                var result = _kycService.GetAllPendingKyc();
                return Ok(result.Select(k => new
                {
                    kycId = k.KycId, userId = k.UserId, userName = k.UserName, userEmail = k.UserEmail,
                    kycType = k.KycType, createdAt = k.CreatedAt, expiresAt = k.ExpiresAt, fileCount = k.FileCount
                }).ToList());
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("details/{kycId}")]
        [Authorize(Roles = "Administrator")]
        public IActionResult GetKycDetails(Guid kycId)
        {
            try
            {
                var session = _kycService.GetKycDetails(kycId);
                if (session == null)
                    return NotFound(new { message = "KYC session not found" });

                return Ok(new
                {
                    kycId = session.KycId, userId = session.UserId, userName = session.UserName,
                    userEmail = session.UserEmail, status = session.Status, createdAt = session.CreatedAt,
                    expiresAt = session.ExpiresAt, rejectionReason = session.RejectionReason,
                    files = session.Files.Select(f => new
                    {
                        fileId = f.FileId, fileType = f.FileType, fileName = f.FileName,
                        blobPath = f.BlobPath, fileContentBase64 = f.FileContentBase64,
                        mimeType = f.MimeType,
                        dataUri = !string.IsNullOrEmpty(f.FileContentBase64) ? $"data:{f.MimeType};base64,{f.FileContentBase64}" : null,
                        createdAt = f.CreatedAt
                    }),
                    cnp = session.Cnp, address = session.Address, city = session.City,
                    county = session.County, postalCode = session.PostalCode
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("file/{fileId}")]
        [Authorize(Roles = "Administrator")]
        public IActionResult GetKycFile(Guid fileId)
        {
            try
            {
                var file = _kycService.GetKycFile(fileId);
                if (file == null)
                    return NotFound(new { message = "File not found" });

                return Ok(new
                {
                    fileId = file.FileId, fileType = file.FileType, fileName = file.FileName,
                    blobPath = file.BlobPath, fileContentBase64 = file.FileContentBase64,
                    mimeType = file.MimeType,
                    dataUri = !string.IsNullOrEmpty(file.FileContentBase64) ? $"data:{file.MimeType};base64,{file.FileContentBase64}" : null,
                    createdAt = file.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("update-form-data")]
        public IActionResult UpdateKycFormData([FromBody] KycFormDataModel model)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .Select(x => new { Field = x.Key, Errors = x.Value?.Errors.Select(e => e.ErrorMessage) })
                    .ToList();
                return BadRequest(new { message = "Invalid model data", errors });
            }

            if (model == null)
                return BadRequest(new { message = "Form data is required" });

            if (model.KycId == Guid.Empty)
                return BadRequest(new { message = "KycId is required and must be a valid GUID", receivedKycId = model.KycId });

            try
            {
                var userId = GetUserId();
                var success = _kycService.UpdateKycFormData(model.KycId, userId, model.Cnp, model.Address, model.City, model.County, model.PostalCode);

                if (!success)
                    return NotFound(new { message = "KYC session not found or access denied", kycId = model.KycId, userId });

                return Ok(new { message = "KYC form data updated successfully", kycId = model.KycId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message, details = ex.ToString() });
            }
        }

        [HttpPost("update-status")]
        [Authorize(Roles = "Administrator")]
        public IActionResult UpdateKycStatus([FromBody] KycStatusUpdateModel model)
        {
            if (model == null || string.IsNullOrEmpty(model.Status))
                return BadRequest(new { message = "Status is required" });

            if (model.Status == "rejected" && string.IsNullOrEmpty(model.RejectionReason))
                return BadRequest(new { message = "Rejection reason is required when rejecting KYC" });

            try
            {
                var success = _kycService.UpdateKycStatus(model.KycId, model.Status, model.RejectionReason, model.ProviderTransactionId);
                if (!success)
                    return NotFound(new { message = "KYC session not found" });

                return Ok(new { message = "KYC status updated successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class KycStartModel
    {
        public string? KycType { get; set; } = "USER_KYC";
    }

    public class KycUploadModel
    {
        public Guid KycId { get; set; }
        public string FileType { get; set; } = null!;
        public IFormFile File { get; set; } = null!;
    }

    public class KycStatusUpdateModel
    {
        public Guid KycId { get; set; }
        public string Status { get; set; } = null!;
        public string? RejectionReason { get; set; }
        public string? ProviderTransactionId { get; set; }
    }

    public class KycFormDataModel
    {
        public Guid KycId { get; set; }
        public string? Cnp { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? County { get; set; }
        public string? PostalCode { get; set; }
    }
}
