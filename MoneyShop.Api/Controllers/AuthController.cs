using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Account;
using MoneyShop.ServiceInterface.Dtos.Account;
using MoneyShop.ServiceInterface.Interfaces.Auth;
using MoneyShop.Infrastructure.EntityFramework.Extensions.Security;
using MoneyShop.ServiceInterface.SharedDtos;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;
using MoneyShop.DomainServices.RepositoryInterfaces.Auth;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using MoneyShop.Api.Services;
using Microsoft.Extensions.Logging;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : BaseController
    {
        private readonly IAccountService _accountService;
        private readonly JwtTokenGenerator _jwtService;
        private readonly IUserRepository _userRepository;
        private readonly IOtpService _otpService;
        private readonly IKycSessionRepository _kycSessionRepository;
        private readonly FirebaseTokenVerifier _firebaseVerifier;
        private readonly ILogger<AuthController> _logger;
        private const string GenericError = "A apărut o eroare. Încearcă din nou.";

        public AuthController(IAccountService accountService, JwtTokenGenerator jwtService, IUserRepository userRepository, IOtpService otpService, IKycSessionRepository kycSessionRepository, FirebaseTokenVerifier firebaseVerifier, ILogger<AuthController> logger)
        {
            _accountService = accountService;
            _jwtService = jwtService;
            _userRepository = userRepository;
            _otpService = otpService;
            _kycSessionRepository = kycSessionRepository;
            _firebaseVerifier = firebaseVerifier;
            _logger = logger;
        }

        /// <summary>
        /// Register a new user
        /// </summary>
        [HttpPost("register")]
        [EnableRateLimiting("auth")]
        public IActionResult Register([FromBody] RegisterModel model)
        {
            if (model == null || !ModelState.IsValid)
            {
                return BadRequest(new { message = "Invalid registration data", errors = ModelState });
            }

            try
            {
                // Auto-populate audit fields from HTTP context if not provided
                if (string.IsNullOrEmpty(model.IpAddress))
                    model.IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                if (string.IsNullOrEmpty(model.UserAgent))
                    model.UserAgent = HttpContext.Request.Headers["User-Agent"].ToString();
                if (string.IsNullOrEmpty(model.DeviceHash))
                    model.DeviceHash = Convert.ToBase64String(
                        System.Security.Cryptography.SHA256.HashData(
                            System.Text.Encoding.UTF8.GetBytes(model.UserAgent ?? "unknown")
                        )
                    )[..32];

                _accountService.RegisterNewUser(model);

                // Auto-login after registration
                var user = _accountService.Login(model.Email, model.Password);

                if (!user.IsAuthenticated)
                {
                    return BadRequest(new { message = "Registration successful but login failed" });
                }

                var token = _jwtService.GenerateToken(user.Id, user.Email, user.FirstName, user.Role);

                return Ok(new
                {
                    status = "success",
                    user_id = user.Id,
                    token = token,
                    user = new
                    {
                        id = user.Id,
                        email = user.Email,
                        name = user.FirstName,
                        role = user.Role,
                        emailVerified = false,
                        phoneVerified = false,
                        phone = model.Phone,
                        kycStatus = "none"
                    }
                });
            }
            catch (Exception ex) when (ex.Message == "Un cont cu acest email există deja.")
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration failed");
                return StatusCode(500, new { message = GenericError });
            }
        }

        /// <summary>
        /// Login with email and password
        /// </summary>
        [HttpPost("login")]
        [EnableRateLimiting("auth")]
        public IActionResult Login([FromBody] LoginModel model)
        {
            if (model == null || string.IsNullOrEmpty(model.Email) || string.IsNullOrEmpty(model.Password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            try
            {
                var user = _accountService.Login(model.Email, model.Password);

                if (!user.IsAuthenticated)
                {
                    return Unauthorized(new { message = "Invalid email or password" });
                }

                var token = _jwtService.GenerateToken(user.Id, user.Email, user.FirstName, user.Role);

                // Look up verification flags from database
                var dbUser = _userRepository.Get().FirstOrDefault(u => u.IdUtilizator == user.Id);

                var kycSession = _kycSessionRepository.Get()
                    .Where(k => k.UserId == user.Id && k.KycType == "USER_KYC")
                    .OrderByDescending(k => k.CreatedAt)
                    .FirstOrDefault();

                return Ok(new
                {
                    status = "success",
                    user_id = user.Id,
                    token = token,
                    user = new
                    {
                        id = user.Id,
                        email = user.Email,
                        name = user.FirstName,
                        role = user.Role,
                        emailVerified = dbUser?.EmailVerified ?? false,
                        phoneVerified = dbUser?.PhoneVerified ?? false,
                        phone = dbUser?.NumarTelefon,
                        kycStatus = kycSession?.Status ?? "none"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login failed");
                return StatusCode(500, new { message = GenericError });
            }
        }

        [HttpPost("social-login")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> SocialLogin([FromBody] SocialLoginModel model)
        {
            if (model == null || string.IsNullOrEmpty(model.IdToken))
            {
                return BadRequest(new { message = "IdToken is required" });
            }
            try
            {
                var firebaseUser = await _firebaseVerifier.VerifyIdTokenAsync(model.IdToken);
                if (string.IsNullOrEmpty(firebaseUser.Email))
                {
                    return BadRequest(new { message = "Firebase token does not contain an email" });
                }
                var user = _accountService.SocialLogin(firebaseUser.Uid, firebaseUser.Email, firebaseUser.Name);
                if (!user.IsAuthenticated)
                {
                    return StatusCode(500, new { message = "Failed to create or find user" });
                }
                var token = _jwtService.GenerateToken(user.Id, user.Email, user.FirstName, user.Role);
                var dbUser = _userRepository.Get().FirstOrDefault(u => u.IdUtilizator == user.Id);
                var kycSession = _kycSessionRepository.Get()
                    .Where(k => k.UserId == user.Id && k.KycType == "USER_KYC")
                    .OrderByDescending(k => k.CreatedAt)
                    .FirstOrDefault();
                return Ok(new
                {
                    token,
                    user = new
                    {
                        id = user.Id.ToString(),
                        name = user.FirstName,
                        email = user.Email,
                        phone = dbUser?.NumarTelefon,
                        role = user.Role,
                        emailVerified = dbUser?.EmailVerified ?? false,
                        phoneVerified = dbUser?.PhoneVerified ?? false,
                        kycStatus = kycSession?.Status ?? "none",
                        onboardingCompleted = false
                    }
                });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (SecurityTokenException ex)
            {
                _logger.LogWarning(ex, "Invalid Firebase token");
                return Unauthorized(new { message = "Invalid Firebase token" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Social login failed");
                return StatusCode(500, new { message = GenericError });
            }
        }

        /// <summary>
        /// Get current user info (requires authentication)
        /// </summary>
        [HttpGet("me")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public IActionResult GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            // Get user directly from database
            var user = _userRepository.Get().FirstOrDefault(u => u.IdUtilizator == userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            var userRoles = new UserRoles();
            var rolesDict = userRoles.CreateUserRolesDictionary();

            var kycSession = _kycSessionRepository.Get()
                .Where(k => k.UserId == user.IdUtilizator && k.KycType == "USER_KYC")
                .OrderByDescending(k => k.CreatedAt)
                .FirstOrDefault();

            return Ok(new
            {
                id = user.IdUtilizator,
                email = user.Mail,
                name = $"{user.Nume} {user.Prenume}",
                role = rolesDict.ContainsKey(user.IdRol) ? rolesDict[user.IdRol] : "User",
                emailVerified = user.EmailVerified,
                phoneVerified = user.PhoneVerified,
                phone = user.NumarTelefon,
                kycStatus = kycSession?.Status ?? "none"
            });
        }

        /// <summary>
        /// Send verification code to email
        /// </summary>
        [HttpPost("send-email-verification")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public IActionResult SendEmailVerification([FromBody] SendVerificationRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var user = _userRepository.Get().FirstOrDefault(u => u.IdUtilizator == userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                var email = request.Email ?? user.Mail;
                if (string.IsNullOrEmpty(email))
                {
                    return BadRequest(new { message = "Email is required" });
                }

                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var result = _otpService.RequestOtp(email, "EMAIL_VERIFY", userId, ip, null, "email");

                return Ok(new
                {
                    success = true,
                    message = "Verification code sent to email",
                    otpId = result.OtpId,
                    expiresInSeconds = result.ExpiresInSeconds
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.StartsWith("Too many"))
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Verification request failed");
                return StatusCode(500, new { message = GenericError });
            }
        }

        /// <summary>
        /// Send verification code to phone via SMS
        /// </summary>
        [HttpPost("send-phone-verification")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public IActionResult SendPhoneVerification([FromBody] SendVerificationRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var user = _userRepository.Get().FirstOrDefault(u => u.IdUtilizator == userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                var phone = request.Phone ?? user.NumarTelefon;
                if (string.IsNullOrEmpty(phone))
                {
                    return BadRequest(new { message = "Phone number is required" });
                }

                // Normalize to international format for SMS (e.g. "0712345678" -> "40712345678")
                var smsPhone = NormalizePhoneForSms(phone);

                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var result = _otpService.RequestOtp(smsPhone, "PHONE_VERIFY", userId, ip, null, "sms");

                return Ok(new
                {
                    success = true,
                    message = "Verification code sent to phone",
                    otpId = result.OtpId,
                    expiresInSeconds = result.ExpiresInSeconds
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.StartsWith("Too many"))
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Verification request failed");
                return StatusCode(500, new { message = GenericError });
            }
        }

        /// <summary>
        /// Verify email code
        /// </summary>
        [HttpPost("verify-email")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyCodeRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var user = _userRepository.Get().FirstOrDefault(u => u.IdUtilizator == userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                var email = request.Email ?? user.Mail;
                if (string.IsNullOrEmpty(email))
                {
                    return BadRequest(new { message = "Email is required" });
                }

                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var result = _otpService.VerifyOtp(request.OtpId, email, "EMAIL_VERIFY", request.Code, ip);

                if (!result.IsValid)
                {
                    return BadRequest(new { message = result.Message });
                }

                // Update user email verification status
                user.EmailVerified = true;
                if (!string.IsNullOrEmpty(request.Email) && request.Email != user.Mail)
                {
                    user.Mail = request.Email;
                }
                _userRepository.Update(user);
                await _userRepository.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Email verified successfully",
                    emailVerified = true
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.StartsWith("Too many"))
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Verification request failed");
                return StatusCode(500, new { message = GenericError });
            }
        }

        /// <summary>
        /// Verify phone code
        /// </summary>
        [HttpPost("verify-phone")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> VerifyPhone([FromBody] VerifyCodeRequest request)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
                {
                    return Unauthorized(new { message = "Invalid token" });
                }

                var user = _userRepository.Get().FirstOrDefault(u => u.IdUtilizator == userId);
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                var phone = request.Phone ?? user.NumarTelefon;
                if (string.IsNullOrEmpty(phone))
                {
                    return BadRequest(new { message = "Phone number is required" });
                }

                // Normalize to same format used when OTP was created
                var smsPhone = NormalizePhoneForSms(phone);

                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var result = _otpService.VerifyOtp(request.OtpId, smsPhone, "PHONE_VERIFY", request.Code, ip);

                if (!result.IsValid)
                {
                    return BadRequest(new { message = result.Message });
                }

                // Update user phone verification status
                user.PhoneVerified = true;
                if (!string.IsNullOrEmpty(request.Phone) && request.Phone != user.NumarTelefon)
                {
                    user.NumarTelefon = request.Phone;
                }
                _userRepository.Update(user);
                await _userRepository.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Phone verified successfully",
                    phoneVerified = true
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.StartsWith("Too many"))
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Verification request failed");
                return StatusCode(500, new { message = GenericError });
            }
        }

        /// <summary>
        /// Normalize Romanian phone to international format for SMS.
        /// "0712345678" -> "40712345678", "+40712345678" -> "40712345678"
        /// </summary>
        private static string NormalizePhoneForSms(string phone)
        {
            var digits = new string(phone.Where(char.IsDigit).ToArray());

            // Already has country code (40...)
            if (digits.StartsWith("40") && digits.Length >= 11)
                return digits;

            // Local format starting with 0
            if (digits.StartsWith("0"))
                return "40" + digits.Substring(1);

            // Just digits without prefix (e.g. "712345678")
            if (digits.Length == 9)
                return "40" + digits;

            return digits;
        }
    }

    public class SendVerificationRequest
    {
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }

    public class VerifyCodeRequest
    {
        public Guid OtpId { get; set; }
        public string Code { get; set; } = null!;
        public string? Email { get; set; }
        public string? Phone { get; set; }
    }
}
