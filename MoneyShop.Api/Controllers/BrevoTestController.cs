using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceAdapters.Services.Otp;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BrevoTestController : ControllerBase
    {
        private readonly EmailService _emailService;
        private readonly SmsService _smsService;

        public BrevoTestController(EmailService emailService, SmsService smsService)
        {
            _emailService = emailService;
            _smsService = smsService;
        }

        /// <summary>
        /// Send a test email via Brevo. No auth required.
        /// </summary>
        [HttpPost("email")]
        public async Task<IActionResult> TestEmail([FromBody] TestEmailRequest request)
        {
            if (string.IsNullOrEmpty(request.To))
                return BadRequest(new { message = "Email address is required" });

            var code = "123456";
            var success = await _emailService.SendVerificationCodeAsync(request.To, code);

            return Ok(new
            {
                success,
                message = success
                    ? $"Test email sent to {request.To} with code {code}"
                    : "Failed to send email — check server logs"
            });
        }

        /// <summary>
        /// Send a test SMS via Brevo. No auth required.
        /// </summary>
        [HttpPost("sms")]
        public async Task<IActionResult> TestSms([FromBody] TestSmsRequest request)
        {
            if (string.IsNullOrEmpty(request.To))
                return BadRequest(new { message = "Phone number is required (e.g. +40712345678)" });

            var code = "654321";
            var success = await _smsService.SendVerificationCodeAsync(request.To, code);

            return Ok(new
            {
                success,
                message = success
                    ? $"Test SMS sent to {request.To} with code {code}"
                    : "Failed to send SMS — check server logs"
            });
        }
    }

    public class TestEmailRequest
    {
        public string To { get; set; } = null!;
    }

    public class TestSmsRequest
    {
        public string To { get; set; } = null!;
    }
}
