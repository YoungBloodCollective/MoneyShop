using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Application;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.DomainModel.Entities;
using System.Security.Claims;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AgreementsController : BaseController
    {
        private readonly IApplicationService _applicationService;
        private readonly IAgreementRepository _agreementRepository;

        public AgreementsController(IApplicationService applicationService, IAgreementRepository agreementRepository)
        {
            _applicationService = applicationService;
            _agreementRepository = agreementRepository;
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateAgreements([FromBody] GenerateAgreementsRequest request)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var application = _applicationService.GetApplicationById(request.ApplicationId);
            if (application == null) return NotFound(new { message = "Application not found" });
            if (application.UserId != userId) return Forbid();

            var agreementTypes = new[] { "acord_marketing", "consimtamant_gdpr", "acord_intermediere", "mandat_brokeraj" };
            var generatedAgreements = new List<Agreement>();

            foreach (var agreementType in agreementTypes)
            {
                var agreement = new Agreement
                {
                    ApplicationId = request.ApplicationId,
                    AgreementType = agreementType,
                    PdfBlobPath = $"agreements/{request.ApplicationId}/{agreementType}.pdf",
                    Version = "1.0",
                    CreatedAt = DateTime.UtcNow
                };
                _agreementRepository.Insert(agreement);
                generatedAgreements.Add(agreement);
            }

            await _agreementRepository.SaveChangesAsync();
            return Ok(generatedAgreements);
        }

        [HttpPost("{id}/sign")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> SignAgreement(int id, [FromForm] SignAgreementRequest signRequest)
        {
            if (signRequest.Signature == null || signRequest.Signature.Length == 0)
                return BadRequest(new { message = "No signature uploaded" });
            var signature = signRequest.Signature;

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var agreement = _agreementRepository.Get().FirstOrDefault(a => a.Id == id);
            if (agreement == null) return NotFound(new { message = "Agreement not found" });

            var application = _applicationService.GetApplicationById(agreement.ApplicationId);
            if (application == null || application.UserId != userId) return Forbid();

            agreement.SignatureImagePath = $"signatures/{agreement.ApplicationId}/{id}.png";
            agreement.SignedAt = DateTime.UtcNow;

            _agreementRepository.Update(agreement);
            await _agreementRepository.SaveChangesAsync();

            return Ok(new { message = "Agreement signed successfully" });
        }

        [HttpGet("application/{applicationId}")]
        public IActionResult GetApplicationAgreements(int applicationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var application = _applicationService.GetApplicationById(applicationId);
            if (application == null) return NotFound(new { message = "Application not found" });
            if (application.UserId != userId) return Forbid();

            var agreements = _agreementRepository.Get().Where(a => a.ApplicationId == applicationId).ToList();
            return Ok(agreements);
        }

        [HttpGet("{id}")]
        public IActionResult GetAgreement(int id)
        {
            var agreement = _agreementRepository.Get().FirstOrDefault(a => a.Id == id);
            if (agreement == null) return NotFound(new { message = "Agreement not found" });

            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var application = _applicationService.GetApplicationById(agreement.ApplicationId);
            if (application == null || application.UserId != userId) return Forbid();

            return Ok(agreement);
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                return null;
            return userId;
        }
    }

    public class GenerateAgreementsRequest
    {
        public int ApplicationId { get; set; }
    }

    public class SignAgreementRequest
    {
        public IFormFile Signature { get; set; } = null!;
    }
}
