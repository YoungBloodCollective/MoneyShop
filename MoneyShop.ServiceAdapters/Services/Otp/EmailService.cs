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

    public async Task<bool> SendAppointmentNotificationAsync(string toEmail, int appointmentId, string nume, string prenume, string telefon, string judet, string tipCredit, decimal salariuNet, string email)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                System.Diagnostics.Debug.WriteLine($"[DEV] New appointment notification for {toEmail}: #{appointmentId} - {nume} {prenume}");
                return true;
            }

            var subject = $"Programare noua #{appointmentId} - {nume} {prenume}";
            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
    <h2 style=""color: #16a34a;"">Programare noua inregistrata</h2>
    <table style=""width: 100%; border-collapse: collapse; margin-top: 16px;"">
        <tr><td style=""padding: 8px; font-weight: bold; color: #555; width: 40%;"">ID</td><td style=""padding: 8px;"">#{appointmentId}</td></tr>
        <tr style=""background:#f9f9f9""><td style=""padding: 8px; font-weight: bold; color: #555;"">Nume</td><td style=""padding: 8px;"">{nume} {prenume}</td></tr>
        <tr><td style=""padding: 8px; font-weight: bold; color: #555;"">Telefon</td><td style=""padding: 8px;"">{telefon}</td></tr>
        <tr style=""background:#f9f9f9""><td style=""padding: 8px; font-weight: bold; color: #555;"">Email</td><td style=""padding: 8px;"">{(string.IsNullOrEmpty(email) ? "-" : email)}</td></tr>
        <tr><td style=""padding: 8px; font-weight: bold; color: #555;"">Judet</td><td style=""padding: 8px;"">{(string.IsNullOrEmpty(judet) ? "-" : judet)}</td></tr>
        <tr style=""background:#f9f9f9""><td style=""padding: 8px; font-weight: bold; color: #555;"">Tip credit</td><td style=""padding: 8px;"">{(string.IsNullOrEmpty(tipCredit) ? "-" : tipCredit)}</td></tr>
        <tr><td style=""padding: 8px; font-weight: bold; color: #555;"">Salariu net</td><td style=""padding: 8px;"">{salariuNet:N0} RON</td></tr>
    </table>
    <p style=""margin-top: 24px; color: #666; font-size: 12px;"">Echipa MoneyShop</p>
</div>";

            var emailRequest = new
            {
                sender = new { name = _fromName, email = _fromEmail },
                to = new[] { new { email = toEmail } },
                subject = subject,
                htmlContent = body
            };

            var response = await _httpClient.PostAsJsonAsync("smtp/email", emailRequest);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[EmailService] Error sending appointment notification: {ex.Message}");
            return false;
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
