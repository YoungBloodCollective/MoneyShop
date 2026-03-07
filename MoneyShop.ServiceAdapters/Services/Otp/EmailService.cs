using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;

namespace MoneyShop.ServiceAdapters.Services.Otp;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public EmailService(IConfiguration configuration, HttpClient httpClient)
    {
        _configuration = configuration;
        _httpClient = httpClient;
        _apiKey = _configuration["Brevo:ApiKey"] ?? "";
        _fromEmail = _configuration["Brevo:FromEmail"] ?? "";
        _fromName = _configuration["Brevo:FromName"] ?? "MoneyShop";

        // Configure HttpClient for Brevo API
        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.BaseAddress = new Uri("https://api.brevo.com/v3/");
            _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);
        }
    }

    public async Task<bool> SendVerificationCodeAsync(string toEmail, string code)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                // In development, just log the code
                System.Diagnostics.Debug.WriteLine($"[DEV] Email verification code for {toEmail}: {code}");
                return true;
            }

            var subject = "Cod de verificare MoneyShop";
            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
    <h2 style=""color: #333;"">Verificare adresa de email</h2>
    <p>Buna ziua,</p>
    <p>Va rugam sa folositi urmatorul cod pentru a verifica adresa dvs. de email:</p>
    <div style=""background-color: #f5f5f5; border: 2px solid #333; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0;"">
        <h1 style=""color: #333; margin: 0; font-size: 32px; letter-spacing: 5px;"">{code}</h1>
    </div>
    <p>Acest cod expira in 10 minute.</p>
    <p>Daca nu ati solicitat acest cod, va rugam sa ignorati acest email.</p>
    <p style=""margin-top: 30px; color: #666; font-size: 12px;"">Echipa MoneyShop</p>
</div>";

            var emailRequest = new
            {
                sender = new
                {
                    name = _fromName,
                    email = _fromEmail
                },
                to = new[]
                {
                    new { email = toEmail }
                },
                subject = subject,
                htmlContent = body
            };

            var response = await _httpClient.PostAsJsonAsync("smtp/email", emailRequest);

            if (response.IsSuccessStatusCode)
            {
                System.Diagnostics.Debug.WriteLine($"[EmailService] Email sent successfully to {toEmail}");
                return true;
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                System.Diagnostics.Debug.WriteLine($"[EmailService] Failed to send email to {toEmail}. Status: {response.StatusCode}, Error: {errorContent}");
                return false;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[EmailService] Error sending email: {ex.Message}");
            return false;
        }
    }
}
