using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;

namespace MoneyShop.ServiceAdapters.Services.Otp;

public class SmsService
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _senderName;

    public SmsService(IConfiguration configuration, HttpClient httpClient)
    {
        _configuration = configuration;
        _httpClient = httpClient;
        _apiKey = _configuration["Brevo:ApiKey"] ?? "";
        _senderName = _configuration["Brevo:SmsSenderName"] ?? "MoneyShop";

        // Configure HttpClient for Brevo API
        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.BaseAddress = new Uri("https://api.brevo.com/v3/");
            _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);
        }
    }

    public async Task<bool> SendVerificationCodeAsync(string toPhoneNumber, string code)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                // In development, just log the code
                System.Diagnostics.Debug.WriteLine($"[DEV] SMS verification code for {toPhoneNumber}: {code}");
                return true;
            }

            var message = $"Codul dvs. de verificare MoneyShop este: {code}. Expira in 10 minute.";

            var smsRequest = new
            {
                sender = _senderName,
                recipient = toPhoneNumber,
                content = message,
                type = "transactional"
            };

            var response = await _httpClient.PostAsJsonAsync("transactionalSMS/sms", smsRequest);

            if (response.IsSuccessStatusCode)
            {
                System.Diagnostics.Debug.WriteLine($"[SmsService] SMS sent successfully to {toPhoneNumber}");
                return true;
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                System.Diagnostics.Debug.WriteLine($"[SmsService] Failed to send SMS to {toPhoneNumber}. Status: {response.StatusCode}, Error: {errorContent}");
                System.Diagnostics.Debug.WriteLine($"[DEV] SMS verification code for {toPhoneNumber}: {code}");
                return false;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[SmsService] Error sending SMS: {ex.Message}");
            System.Diagnostics.Debug.WriteLine($"[DEV] SMS verification code for {toPhoneNumber}: {code}");
            return false;
        }
    }
}
