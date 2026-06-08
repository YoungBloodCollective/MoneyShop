using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;

namespace MoneyShop.ServiceAdapters.Services.Otp;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<EmailService> _logger;
    private readonly string _apiKey;
    private readonly string _fromEmail;
    private readonly string _fromName;

    public EmailService(IConfiguration configuration, HttpClient httpClient, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = _configuration["Brevo:ApiKey"] ?? "";
        _fromEmail = _configuration["Brevo:FromEmail"] ?? "";
        _fromName = _configuration["Brevo:FromName"] ?? "MoneyShop";

        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.BaseAddress = new Uri("https://api.brevo.com/v3/");
            _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);
        }
    }

    public async Task<bool> SendAppointmentNotificationAsync(string toEmail, int appointmentId, string nume, string prenume, string telefon, string judet, string tipCredit, decimal salariuNet, string email, string? intarzieriBirou = null, string? popriRecuperare = null)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                _logger.LogWarning("[EmailService] Brevo ApiKey or FromEmail not configured — skipping appointment notification #{AppointmentId}", appointmentId);
                return false;
            }

            var intarzieriDisplay = string.IsNullOrEmpty(intarzieriBirou)
                ? "-"
                : intarzieriBirou == "NU"
                    ? "Nu"
                    : intarzieriBirou.Replace("Da-", "").ToLowerInvariant() + " intarziere";

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
        <tr style=""background:#f9f9f9""><td style=""padding: 8px; font-weight: bold; color: #555;"">Intarzieri Birou Credit</td><td style=""padding: 8px;"">{intarzieriDisplay}</td></tr>
        <tr><td style=""padding: 8px; font-weight: bold; color: #555;"">Popriri / recuperare (ultimii 4 ani)</td><td style=""padding: 8px;"">{(string.IsNullOrEmpty(popriRecuperare) ? "-" : popriRecuperare)}</td></tr>
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
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[EmailService] Brevo rejected appointment notification #{AppointmentId}. Status: {Status}, Body: {Error}", appointmentId, response.StatusCode, error);
            }
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailService] Exception sending appointment notification #{AppointmentId}", appointmentId);
            return false;
        }
    }

    public async Task<bool> SendPartnerApplicationNotificationAsync(string toEmail, int applicationId, string nume, string prenume, string telefon, string judet, string email, string descriere)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                _logger.LogWarning("[EmailService] Brevo ApiKey or FromEmail not configured — skipping partner notification #{ApplicationId}", applicationId);
                return false;
            }

            var subject = $"Cerere partener noua #{applicationId} - {nume} {prenume}";
            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
    <h2 style=""color: #2563eb;"">Cerere noua: Devino Partener</h2>
    <table style=""width: 100%; border-collapse: collapse; margin-top: 16px;"">
        <tr><td style=""padding: 8px; font-weight: bold; color: #555; width: 40%;"">ID</td><td style=""padding: 8px;"">#{applicationId}</td></tr>
        <tr style=""background:#f9f9f9""><td style=""padding: 8px; font-weight: bold; color: #555;"">Nume</td><td style=""padding: 8px;"">{nume} {prenume}</td></tr>
        <tr><td style=""padding: 8px; font-weight: bold; color: #555;"">Telefon</td><td style=""padding: 8px;"">{telefon}</td></tr>
        <tr style=""background:#f9f9f9""><td style=""padding: 8px; font-weight: bold; color: #555;"">Email</td><td style=""padding: 8px;"">{(string.IsNullOrEmpty(email) ? "-" : email)}</td></tr>
        <tr><td style=""padding: 8px; font-weight: bold; color: #555;"">Judet</td><td style=""padding: 8px;"">{(string.IsNullOrEmpty(judet) ? "-" : judet)}</td></tr>
        <tr style=""background:#f9f9f9""><td style=""padding: 8px; font-weight: bold; color: #555;"">Descriere</td><td style=""padding: 8px; white-space: pre-wrap;"">{(string.IsNullOrEmpty(descriere) ? "-" : descriere)}</td></tr>
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
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[EmailService] Brevo rejected partner notification #{ApplicationId}. Status: {Status}, Body: {Error}", applicationId, response.StatusCode, error);
            }
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailService] Exception sending partner notification #{ApplicationId}", applicationId);
            return false;
        }
    }

    public async Task<bool> SendVerificationCodeAsync(string toEmail, string code)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                _logger.LogWarning("[EmailService] Brevo ApiKey or FromEmail not configured — skipping verification code to {Email}", toEmail);
                return false;
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

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("[EmailService] Brevo rejected verification code to {Email}. Status: {Status}, Body: {Error}", toEmail, response.StatusCode, errorContent);
            }
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailService] Exception sending verification code to {Email}", toEmail);
            return false;
        }
    }
}
