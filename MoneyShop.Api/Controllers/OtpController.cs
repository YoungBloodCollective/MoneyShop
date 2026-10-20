using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Auth;
using System;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;
using MoneyShop.DomainServices.RepositoryInterfaces.Auth;
using MoneyShop.Infrastructure.EntityFramework.Extensions.Security;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OtpController : BaseController
    {
        private readonly IOtpService _otpService;

        public OtpController(IOtpService otpService)
        {
            _otpService = otpService;
        }

        [HttpPost("request")]
        public IActionResult RequestOtp([FromBody] OtpRequestModel model)
        {
            if (model == null || string.IsNullOrEmpty(model.Phone) || string.IsNullOrEmpty(model.Purpose))
                return BadRequest(new { message = "Phone and purpose are required" });

            try
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var deviceHash = ComputeDeviceHash();

                var result = _otpService.RequestOtp(model.Phone, model.Purpose, null, ip, deviceHash, model.Channel);

                return Ok(new { otpId = result.OtpId, expiresInSeconds = result.ExpiresInSeconds });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("verify")]
        public async Task<IActionResult> VerifyOtp([FromBody] OtpVerifyModel model)
        {
            if (model == null ||
                model.OtpId == Guid.Empty ||
                string.IsNullOrEmpty(model.Phone) ||
                string.IsNullOrEmpty(model.Code) ||
                string.IsNullOrEmpty(model.Purpose))
                return BadRequest(new { message = "OtpId, phone, code, and purpose are required" });

            try
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var result = _otpService.VerifyOtp(model.OtpId, model.Phone, model.Purpose, model.Code, ip);

                if (!result.IsValid)
                    return Unauthorized(new { message = result.Message });

                var userRepository = HttpContext.RequestServices.GetRequiredService<IUserRepository>();

                // Update EmailVerified / PhoneVerified status
                if (model.Purpose == "EMAIL_VERIFY")
                {
                    var user = userRepository.Get().FirstOrDefault(u => u.Mail == model.Phone && u.IsDeleted != true);
                    if (user != null)
                    {
                        user.EmailVerified = true;
                        await userRepository.SaveChangesAsync();
                    }
                }
                else if (model.Purpose == "PHONE_VERIFY")
                {
                    var user = FindUserByPhone(userRepository, model.Phone);
                    if (user != null)
                    {
                        user.PhoneVerified = true;
                        await userRepository.SaveChangesAsync();
                    }
                }

                if (model.Purpose == "LOGIN_SMS")
                {
                    var jwtService = HttpContext.RequestServices.GetRequiredService<JwtTokenGenerator>();
                    var sessionRepository = HttpContext.RequestServices.GetRequiredService<ISessionRepository>();

                    var user = FindUserByPhone(userRepository, model.Phone);
                    if (user == null)
                        return Unauthorized(new { message = "User not found" });

                    var session = new MoneyShop.DomainModel.Entities.Session
                    {
                        SessionId = Guid.NewGuid(),
                        UserId = user.IdUtilizator,
                        CreatedAt = DateTime.UtcNow,
                        ExpiresAt = DateTime.UtcNow.AddHours(24),
                        Ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
                        UserAgent = HttpContext.Request.Headers["User-Agent"].ToString(),
                        SourceChannel = "web"
                    };

                    sessionRepository.Insert(session);
                    await sessionRepository.SaveChangesAsync();

                    var userRoles = new UserRoles();
                    var rolesDict = userRoles.CreateUserRolesDictionary();
                    var role = rolesDict.ContainsKey(user.IdRol) ? rolesDict[user.IdRol] : "User";

                    var token = jwtService.GenerateToken(
                        user.IdUtilizator, user.Mail ?? "", $"{user.Nume} {user.Prenume}", role);

                    return Ok(new
                    {
                        status = "success",
                        accessToken = token,
                        expiresInSeconds = 3600 * 24,
                        user = new
                        {
                            id = user.IdUtilizator,
                            email = user.Mail,
                            name = $"{user.Nume} {user.Prenume}",
                            phone = user.NumarTelefon,
                            role,
                            emailVerified = user.EmailVerified,
                            phoneVerified = user.PhoneVerified
                        }
                    });
                }

                return Ok(new { status = "success", message = result.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private static MoneyShop.DomainModel.Entities.Utilizatori? FindUserByPhone(IUserRepository userRepository, string phone)
        {
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.StartsWith("40") && digits.Length == 11) digits = "0" + digits.Substring(2);
            if (digits.StartsWith("0040") && digits.Length == 13) digits = "0" + digits.Substring(4);

            return userRepository.Get()
                .FirstOrDefault(u => (u.NumarTelefon == digits || u.NumarTelefon == phone) && u.IsDeleted != true);
        }

        private byte[]? ComputeDeviceHash()
        {
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
            if (string.IsNullOrEmpty(userAgent)) return null;
            using var sha256 = System.Security.Cryptography.SHA256.Create();
            return sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(userAgent));
        }
    }

    public class OtpRequestModel
    {
        public string Phone { get; set; } = null!;
        public string Purpose { get; set; } = null!;
        public string? Channel { get; set; } = "sms";
    }

    public class OtpVerifyModel
    {
        public Guid OtpId { get; set; }
        public string Code { get; set; } = null!;
        public string Phone { get; set; } = null!;
        public string Purpose { get; set; } = null!;
    }
}
