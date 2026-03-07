using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Auth;
using MoneyShop.DomainServices.RepositoryInterfaces.Auth;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Otp;
using Microsoft.Extensions.Configuration;

namespace MoneyShop.ServiceAdapters.Services.Auth;

public class OtpService : IOtpService
{
    private readonly IOtpChallengeRepository _otpChallengeRepository;
    private readonly MoneyShopDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly EmailService _emailService;
    private readonly SmsService _smsService;
    private const int OTP_LENGTH = 6;
    private const int OTP_EXPIRY_MINUTES_LOGIN = 5;
    private const int OTP_EXPIRY_MINUTES_SIGN = 3;
    private const int OTP_EXPIRY_MINUTES_VERIFY = 10;
    private const int MAX_ATTEMPTS = 5;

    public OtpService(
        IOtpChallengeRepository otpChallengeRepository,
        MoneyShopDbContext context,
        IConfiguration configuration,
        EmailService emailService,
        SmsService smsService)
    {
        _otpChallengeRepository = otpChallengeRepository;
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
        _smsService = smsService;
    }

    /// <summary>
    /// Request OTP for login, signing, or verification
    /// </summary>
    public OtpRequestResult RequestOtp(string phoneOrEmail, string purpose, int? userId, string? ip, byte[]? deviceHash, string? channel = null)
    {
        // Validate purpose
        if (!new[] { "LOGIN_SMS", "SIGN_SMS", "EMAIL_VERIFY", "PHONE_VERIFY", "STEP_UP_SECURITY" }.Contains(purpose))
        {
            throw new ArgumentException("Invalid purpose");
        }

        // Determine channel (sms or email) based on purpose or parameter
        var isEmail = channel == "email" || purpose == "EMAIL_VERIFY" || phoneOrEmail.Contains("@");
        var isPhone = channel == "sms" || purpose == "PHONE_VERIFY" || purpose == "LOGIN_SMS" || purpose == "SIGN_SMS";

        // Rate limiting check
        var recentAttempts = _otpChallengeRepository.Get()
            .Where(o => o.Phone == phoneOrEmail &&
                       o.Purpose == purpose &&
                       o.CreatedAt > DateTime.UtcNow.AddMinutes(-10))
            .Count();

        if (recentAttempts >= 3)
        {
            throw new InvalidOperationException("Too many OTP requests. Please wait 10 minutes.");
        }

        // Generate OTP
        var otp = GenerateRandomOtp();
        var otpId = Guid.NewGuid();

        // Hash OTP with pepper (from config or default)
        var pepper = _configuration["Otp:Pepper"] ?? "default-pepper-change-in-production";
        var otpHash = ComputeOtpHash(otp, purpose, phoneOrEmail, pepper);

        // Determine expiry based on purpose
        var expiryMinutes = purpose == "SIGN_SMS"
            ? OTP_EXPIRY_MINUTES_SIGN
            : (purpose == "EMAIL_VERIFY" || purpose == "PHONE_VERIFY")
                ? OTP_EXPIRY_MINUTES_VERIFY
                : OTP_EXPIRY_MINUTES_LOGIN;
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        // Save OTP challenge
        var challenge = new OtpChallenge
        {
            OtpId = otpId,
            UserId = userId,
            Phone = phoneOrEmail, // Store email or phone in Phone field for now
            Purpose = purpose,
            OtpHash = otpHash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
            Attempts = 0,
            Ip = ip,
            DeviceHash = deviceHash
        };

        _otpChallengeRepository.Insert(challenge);
        _context.SaveChanges();

        // Send OTP via appropriate channel
        if (isEmail)
        {
            _ = _emailService.SendVerificationCodeAsync(phoneOrEmail, otp);
        }
        else if (isPhone)
        {
            _ = _smsService.SendVerificationCodeAsync(phoneOrEmail, otp);
        }
        else
        {
            // Fallback: log it
            Console.WriteLine($"[DEV] OTP for {phoneOrEmail} ({purpose}): {otp} (expires in {expiryMinutes} min)");
        }

        return new OtpRequestResult
        {
            OtpId = otpId,
            ExpiresInSeconds = expiryMinutes * 60
        };
    }

    /// <summary>
    /// Verify OTP and return success status
    /// </summary>
    public OtpVerifyResult VerifyOtp(Guid otpId, string phoneOrEmail, string purpose, string code, string? ip)
    {
        var challenge = _otpChallengeRepository.Get()
            .FirstOrDefault(o => o.OtpId == otpId &&
                               o.Phone == phoneOrEmail &&
                               o.Purpose == purpose);

        if (challenge == null)
        {
            return new OtpVerifyResult { IsValid = false, Message = "OTP not found" };
        }

        // Check if already used
        if (challenge.UsedAt.HasValue)
        {
            return new OtpVerifyResult { IsValid = false, Message = "OTP already used" };
        }

        // Check if expired
        if (challenge.ExpiresAt < DateTime.UtcNow)
        {
            return new OtpVerifyResult { IsValid = false, Message = "OTP expired" };
        }

        // Check attempts
        if (challenge.Attempts >= MAX_ATTEMPTS)
        {
            return new OtpVerifyResult { IsValid = false, Message = "Too many attempts. OTP locked." };
        }

        // Verify hash
        var pepper = _configuration["Otp:Pepper"] ?? "default-pepper-change-in-production";
        var computedHash = ComputeOtpHash(code, purpose, phoneOrEmail, pepper);

        if (!challenge.OtpHash.SequenceEqual(computedHash))
        {
            // Increment attempts
            challenge.Attempts++;
            _context.SaveChanges();

            return new OtpVerifyResult
            {
                IsValid = false,
                Message = $"Invalid code. {MAX_ATTEMPTS - challenge.Attempts} attempts remaining."
            };
        }

        // Mark as used
        challenge.UsedAt = DateTime.UtcNow;
        _context.SaveChanges();

        return new OtpVerifyResult
        {
            IsValid = true,
            Message = "OTP verified successfully",
            UserId = challenge.UserId
        };
    }

    private string GenerateRandomOtp()
    {
        var random = new Random();
        return random.Next(100000, 999999).ToString();
    }

    private byte[] ComputeOtpHash(string otp, string purpose, string phoneOrEmail, string pepper)
    {
        var input = $"{otp}|{purpose}|{phoneOrEmail}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(pepper));
        return hmac.ComputeHash(Encoding.UTF8.GetBytes(input));
    }
}
