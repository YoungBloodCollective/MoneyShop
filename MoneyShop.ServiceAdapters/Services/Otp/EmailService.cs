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
            var subjectName = Plain($"{nume} {prenume}");
            nume = Html(nume);
            prenume = Html(prenume);
            telefon = Html(telefon);
            judet = Html(judet);
            tipCredit = Html(tipCredit);
            email = Html(email);
            intarzieriBirou = Html(intarzieriBirou);
            popriRecuperare = Html(popriRecuperare);
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

            // Everything below comes from the public form: encode it so nobody can inject HTML into the broker's inbox.
            nume = Html(nume); prenume = Html(prenume); telefon = Html(telefon); email = Html(email);
            judet = Html(judet); tipCredit = Html(tipCredit); popriRecuperare = Html(popriRecuperare);
            intarzieriDisplay = Html(intarzieriDisplay);

            var subject = $"Programare noua #{appointmentId} - {subjectName}";
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
            var subjectName = Plain($"{nume} {prenume}");
            nume = Html(nume);
            prenume = Html(prenume);
            telefon = Html(telefon);
            judet = Html(judet);
            email = Html(email);
            descriere = Html(descriere);
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                _logger.LogWarning("[EmailService] Brevo ApiKey or FromEmail not configured — skipping partner notification #{ApplicationId}", applicationId);
                return false;
            }

            // Public form input: encode it (keeping line breaks in the description).
            nume = Html(nume); prenume = Html(prenume); telefon = Html(telefon); email = Html(email); judet = Html(judet);
            descriere = System.Net.WebUtility.HtmlEncode(descriere ?? string.Empty);

            var subject = $"Cerere partener noua #{applicationId} - {subjectName}";
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

    public Task<bool> SendAcordAgreementAsync(string toEmail, string clientName, byte[] agreementPdf, string fileName)
    {
        var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
    <h2 style=""color: #0075EB;"">Acordul dumneavoastra semnat</h2>
    <p>Buna ziua, {Html(clientName)},</p>
    <p>Va multumim pentru increderea acordata. Atasat gasiti o copie a acordului de intermediere si prelucrare date pe care l-ati semnat.</p>
    <p>Pastrati acest document pentru evidenta dumneavoastra. Un consultant MoneyShop va va contacta in cel mai scurt timp.</p>
    <p>Daca nu ati semnat acest acord, va rugam sa ne contactati imediat.</p>
    <p style=""margin-top: 30px; color: #666; font-size: 12px;"">Echipa MoneyShop</p>
</div>";

        return SendPdfAsync(toEmail, "Acordul dumneavoastra semnat - MoneyShop", body, agreementPdf, fileName, "signed agreement");
    }

    public Task<bool> SendMangoAgreementAsync(string toEmail, string clientName, byte[] agreementPdf, string fileName)
    {
        var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
    <h2 style=""color: #0075EB;"">Informare precontractuala si solicitare servicii - Mango Broker</h2>
    <p>Buna ziua, {Html(clientName)},</p>
    <p>Atasat gasiti informarea precontractuala si solicitarea de servicii catre Mango Broker SRL, semnate impreuna cu acordul MoneyShop.</p>
    <p>Pastrati acest document pentru evidenta dumneavoastra.</p>
    <p>Daca nu ati semnat acest document, va rugam sa ne contactati imediat.</p>
    <p style=""margin-top: 30px; color: #666; font-size: 12px;"">Echipa MoneyShop</p>
</div>";

        return SendPdfAsync(toEmail, "Informare precontractuala si solicitare servicii - Mango Broker", body, agreementPdf, fileName, "Mango agreement");
    }

    /// <summary>
    /// Tells a broker that the Super Admin assigned them a lead, appointment or acord.
    /// Only name and phone are included; the details live in the CRM.
    /// </summary>
    public async Task<bool> SendAssignmentNotificationAsync(string toEmail, string kindLabel, string clientName, string? phone, string crmUrl)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                _logger.LogWarning("[EmailService] Brevo ApiKey or FromEmail not configured — skipping assignment notification to {Email}", toEmail);
                return false;
            }

            var subject = $"{Plain(kindLabel)} atribuit: {Plain(clientName)}";
            var body = $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"">
    <h2 style=""color: #16a34a;"">Ai primit un {Html(kindLabel).ToLowerInvariant()} nou</h2>
    <p><strong>{Html(clientName)}</strong>{(string.IsNullOrWhiteSpace(phone) ? "" : $" &middot; {Html(phone)}")}</p>
    <p>Super Admin ți l-a atribuit în CRM-ul MoneyShop.</p>
    <p><a href=""{Html(crmUrl)}"" style=""display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;"">Deschide în CRM</a></p>
    <p style=""margin-top: 24px; color: #666; font-size: 12px;"">Echipa MoneyShop</p>
</div>";

            var emailRequest = new
            {
                sender = new { name = _fromName, email = _fromEmail },
                to = new[] { new { email = toEmail } },
                subject,
                htmlContent = body
            };

            var response = await _httpClient.PostAsJsonAsync("smtp/email", emailRequest);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[EmailService] Brevo rejected assignment notification to {Email}. Status: {Status}, Body: {Error}", toEmail, response.StatusCode, error);
            }
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailService] Exception sending assignment notification to {Email}", toEmail);
            return false;
        }
    }

    // ---- Call booking (Etapa 3) ----

    private static readonly System.Globalization.CultureInfo RoCulture = System.Globalization.CultureInfo.GetCultureInfo("ro-RO");
    private static readonly Lazy<TimeZoneInfo> RoZone = new(() =>
    {
        foreach (var id in new[] { "Europe/Bucharest", "GTB Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch (TimeZoneNotFoundException) { } catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.Utc;
    });

    /// <summary>"marți, 25 noiembrie 2026, 11:00–11:15" in Romanian time.</summary>
    private static string RoSlot(DateTime startUtc, int durationMinutes)
    {
        var start = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(startUtc, DateTimeKind.Utc), RoZone.Value);
        var end = start.AddMinutes(durationMinutes);
        return $"{start.ToString("dddd, d MMMM yyyy", RoCulture)}, {start:HH:mm}–{end:HH:mm}";
    }

    private async Task<bool> SendHtmlAsync(string toEmail, string subject, string body, string description)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                _logger.LogWarning("[EmailService] Brevo ApiKey or FromEmail not configured — skipping {Description}", description);
                return false;
            }
            var emailRequest = new
            {
                sender = new { name = _fromName, email = _fromEmail },
                to = new[] { new { email = toEmail } },
                subject,
                htmlContent = body
            };
            var response = await _httpClient.PostAsJsonAsync("smtp/email", emailRequest);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[EmailService] Brevo rejected {Description}. Status: {Status}, Body: {Error}", description, response.StatusCode, error);
            }
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailService] Exception sending {Description}", description);
            return false;
        }
    }

    private static string BookingLayout(string title, string inner) => $@"
<div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;"">
    <h2 style=""color: #16a34a; margin-bottom: 4px;"">{title}</h2>
    {inner}
    <p style=""margin-top: 28px; color: #64748b; font-size: 12px;"">Echipa MoneyShop &middot; Broker de credite autorizat ANPC</p>
</div>";

    /// <summary>Asks the client to confirm a call booked on the site; the link also lets them move or cancel it.</summary>
    public Task<bool> SendBookingConfirmationRequestAsync(string toEmail, string firstName, DateTime startUtc, int durationMinutes, string manageUrl)
    {
        var url = Html(manageUrl);
        var body = BookingLayout("Confirmă programarea apelului", $@"
    <p>Bună, {Html(firstName)}!</p>
    <p>Ai solicitat o discuție telefonică gratuită cu un broker MoneyShop:</p>
    <p style=""background:#f0fdf4;border-radius:10px;padding:14px 16px;font-size:16px;""><strong>{Html(RoSlot(startUtc, durationMinutes))}</strong></p>
    <p><a href=""{url}"" style=""display:inline-block;padding:12px 22px;background:#16a34a;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;"">Confirmă programarea</a></p>
    <p style=""font-size:14px;"">Nu mai poți atunci? <a href=""{url}"">Reprogramează sau anulează</a> din același link.</p>
    <p style=""font-size:13px;color:#64748b;"">Dacă nu confirmi în {MoneyShop.ServiceInterface.Interfaces.Scheduling.SchedulingRules.UnconfirmedHoldHours} de ore, intervalul se eliberează. Nu ai făcut tu această solicitare? Ignoră mesajul.</p>");
        return SendHtmlAsync(toEmail, "Confirmă programarea apelului - MoneyShop", body, "booking confirmation request");
    }

    /// <summary>Reminder before a confirmed call (24 hours or 30 minutes before).</summary>
    public Task<bool> SendBookingReminderAsync(string toEmail, string firstName, DateTime startUtc, int durationMinutes, bool halfHourBefore)
    {
        var lead = halfHourBefore ? "Te sunăm în aproximativ 30 de minute" : "Mâine te sună un broker MoneyShop";
        var body = BookingLayout(halfHourBefore ? "Te sunăm în curând" : "Reminder: apelul de mâine", $@"
    <p>Bună, {Html(firstName)}!</p>
    <p>{lead}:</p>
    <p style=""background:#f0fdf4;border-radius:10px;padding:14px 16px;font-size:16px;""><strong>{Html(RoSlot(startUtc, durationMinutes))}</strong></p>
    <p style=""font-size:14px;"">Dacă nu mai poți, folosește linkul din emailul de confirmare ca să reprogramezi sau să anulezi.</p>");
        return SendHtmlAsync(toEmail, halfHourBefore ? "Te sunăm în curând - MoneyShop" : "Reminder: apelul de mâine - MoneyShop", body, "booking reminder");
    }

    /// <summary>Reminds the broker of a task they set on a client in the CRM.</summary>
    public Task<bool> SendTaskReminderAsync(string toEmail, string clientName, string? clientPhone, string title, DateTime dueUtc, string crmUrl)
    {
        var due = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(dueUtc, DateTimeKind.Utc), RoZone.Value);
        var body = BookingLayout("Reminder: " + Html(title), $@"
    <p><strong>{Html(clientName)}</strong>{(string.IsNullOrWhiteSpace(clientPhone) ? "" : $" &middot; {Html(clientPhone)}")}</p>
    <p style=""background:#f8fafc;border-radius:10px;padding:14px 16px;font-size:16px;"">{Html(title)}<br><span style=""font-size:13px;color:#64748b;"">{Html(due.ToString("dddd, d MMMM yyyy, HH:mm", RoCulture))}</span></p>
    <p><a href=""{Html(crmUrl)}"" style=""display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;"">Deschide clientul</a></p>");
        return SendHtmlAsync(toEmail, $"Reminder: {Plain(title)} - {Plain(clientName)}", body, "task reminder");
    }

    /// <summary>Tells the broker that a client confirmed, moved or cancelled a booked call.</summary>
    public Task<bool> SendBookingChangeToBrokerAsync(string toEmail, string clientName, string change, DateTime startUtc, int durationMinutes, string crmUrl)
    {
        var body = BookingLayout($"Programare {Html(change)}", $@"
    <p><strong>{Html(clientName)}</strong> a {Html(change)} programarea:</p>
    <p style=""background:#f8fafc;border-radius:10px;padding:14px 16px;font-size:16px;""><strong>{Html(RoSlot(startUtc, durationMinutes))}</strong></p>
    <p><a href=""{Html(crmUrl)}"" style=""display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;"">Deschide calendarul</a></p>");
        return SendHtmlAsync(toEmail, $"Programare {Plain(change)}: {Plain(clientName)}", body, "booking change to broker");
    }

    /// <summary>
    /// "Am primit cererea": every request without a booked time gets a reply right away, saying who
    /// will call, when, and what to prepare (a booked time gets the confirmation email instead).
    /// </summary>
    public Task<bool> SendLeadReceivedAsync(string toEmail, string firstName, string? brokerName)
    {
        var who = string.IsNullOrWhiteSpace(brokerName) ? "Un broker MoneyShop" : Html(brokerName);
        var body = BookingLayout("Am primit cererea ta", $@"
    <p>Bună, {Html(firstName)}!</p>
    <p>{who} te va suna în cel mai scurt timp, în timpul programului (luni–vineri, 09:00–18:00). Discuția durează aproximativ 15 minute, este gratuită și nu te obligă la nimic.</p>
    <p style=""font-weight:bold;margin-bottom:4px;"">Ca să câștigăm timp, poți pregăti:</p>
    <ul style=""margin-top:0;padding-left:20px;"">
        <li>buletinul;</li>
        <li>ultimii fluturași de salariu sau extrasul de cont unde îți intră salariul;</li>
        <li>raportul de la Biroul de Credit, dacă îl ai (dacă nu, te ajutăm noi după apel).</li>
    </ul>
    <p style=""font-size:13px;color:#64748b;"">MoneyShop nu acordă credite: intermediem gratuit cererea ta către băncile partenere. Nu ai făcut tu această cerere? Ignoră mesajul.</p>");
        return SendHtmlAsync(toEmail, "Am primit cererea ta - MoneyShop", body, "lead received");
    }

    /// <summary>"Am uitat parola": the one-hour link to choose a new password.</summary>
    public Task<bool> SendPasswordResetAsync(string toEmail, string firstName, string resetUrl)
    {
        var url = Html(resetUrl);
        var greeting = string.IsNullOrWhiteSpace(firstName) ? "Bună!" : $"Bună, {Html(firstName)}!";
        var body = BookingLayout("Resetează parola", $@"
    <p>{greeting}</p>
    <p>Ai cerut o parolă nouă pentru contul tău MoneyShop. Apasă butonul de mai jos ca s-o alegi:</p>
    <p><a href=""{url}"" style=""display:inline-block;padding:12px 22px;background:#16a34a;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;"">Alege o parolă nouă</a></p>
    <p style=""font-size:13px;color:#64748b;"">Linkul e valabil o oră și se poate folosi o singură dată. Nu ai cerut tu resetarea? Ignoră mesajul: parola rămâne neschimbată.</p>");
        return SendHtmlAsync(toEmail, "Resetează parola - MoneyShop", body, "password reset");
    }

    /// <summary>The Super Admin's invitation to open a broker account in the CRM; the link is private and valid for a limited time.</summary>
    public Task<bool> SendBrokerInviteAsync(string toEmail, string? name, string inviteUrl, int validDays)
    {
        var url = Html(inviteUrl);
        var greeting = string.IsNullOrWhiteSpace(name) ? "Bună!" : $"Bună, {Html(name)}!";
        var body = BookingLayout("Ai fost invitat în CRM-ul MoneyShop", $@"
    <p>{greeting}</p>
    <p>Echipa MoneyShop te invită să-ți deschizi un cont de broker în CRM-ul MoneyShop. Îți alegi parola și adresa ta în CRM, completezi câteva date și gata.</p>
    <p><a href=""{url}"" style=""display:inline-block;padding:12px 22px;background:#16a34a;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold;"">Creează-ți contul</a></p>
    <p style=""font-size:13px;color:#64748b;"">Linkul este personal, valabil {validDays} zile și se poate folosi o singură dată. Nu-l da mai departe. Nu te așteptai la această invitație? Ignoră mesajul.</p>");
        return SendHtmlAsync(toEmail, "Ai fost invitat în CRM-ul MoneyShop", body, "broker invite");
    }

    private static string Plain(string? value) =>
        (value ?? string.Empty).Replace("\r", " ").Replace("\n", " ").Trim();

    private static string Html(string? value) =>
        System.Net.WebUtility.HtmlEncode((value ?? string.Empty).Replace("\r", " ").Replace("\n", " "));

    /// <summary>
    /// Sends the client the call as a calendar event (.ics): Outlook, Gmail and iPhone Mail offer to add it,
    /// and a later email with the same event updates (moved) or removes (cancelled) it.
    /// </summary>
    public Task<bool> SendBookingCalendarAsync(string toEmail, string firstName, int appointmentId, DateTime startUtc, int durationMinutes,
        bool cancelled, DateTime updatedAtUtc, string? brokerName, string manageUrl)
    {
        var ics = MoneyShop.ServiceAdapters.Services.Scheduling.IcsCalendar.Invitation(new MoneyShop.ServiceAdapters.Services.Scheduling.IcsEvent(
            Uid: MoneyShop.ServiceAdapters.Services.Scheduling.IcsCalendar.AppointmentUid(appointmentId),
            StartUtc: startUtc,
            DurationMinutes: durationMinutes,
            Summary: string.IsNullOrWhiteSpace(brokerName) ? "Apel MoneyShop" : $"Apel MoneyShop cu {Plain(brokerName)}",
            Description: $"Discuție telefonică gratuită cu un broker MoneyShop. Te sunăm noi.\nReprogramează sau anulează: {manageUrl}",
            Location: "Apel telefonic",
            Sequence: MoneyShop.ServiceAdapters.Services.Scheduling.IcsCalendar.SequenceFor(updatedAtUtc),
            Cancelled: cancelled,
            OrganizerEmail: _fromEmail,
            AttendeeEmail: toEmail));

        var when = Html(RoSlot(startUtc, durationMinutes));
        var body = cancelled
            ? BookingLayout("Programare anulată", $@"
    <p>Bună, {Html(firstName)}!</p>
    <p>Am anulat apelul din <strong>{when}</strong>. Fișierul atașat îl scoate și din calendarul tău.</p>
    <p style=""font-size:14px;"">Te-ai răzgândit? Poți face oricând o programare nouă pe <a href=""https://moneyshop.ro"">moneyshop.ro</a>.</p>")
            : BookingLayout("Programare confirmată", $@"
    <p>Bună, {Html(firstName)}!</p>
    <p>Te sunăm la ora stabilită:</p>
    <p style=""background:#f0fdf4;border-radius:10px;padding:14px 16px;font-size:16px;""><strong>{when}</strong></p>
    <p style=""font-size:14px;"">Deschide fișierul atașat ca să adaugi apelul în calendar (Outlook, Gmail, iPhone).</p>
    <p style=""font-size:14px;"">Nu mai poți? <a href=""{Html(manageUrl)}"">Reprogramează sau anulează</a>.</p>");

        var subject = cancelled ? "Programare anulată - MoneyShop" : "Programare confirmată - MoneyShop";
        return SendWithAttachmentAsync(toEmail, subject, body, System.Text.Encoding.UTF8.GetBytes(ics), "programare-moneyshop.ics", "booking calendar invitation");
    }

    private Task<bool> SendPdfAsync(string toEmail, string subject, string body, byte[] pdf, string fileName, string description) =>
        SendWithAttachmentAsync(toEmail, subject, body, pdf, fileName, description);

    private async Task<bool> SendWithAttachmentAsync(string toEmail, string subject, string body, byte[] pdf, string fileName, string description)
    {
        try
        {
            if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_fromEmail))
            {
                _logger.LogWarning("[EmailService] Brevo ApiKey or FromEmail not configured — skipping {Description} to {Email}", description, toEmail);
                return false;
            }

            var emailRequest = new
            {
                sender = new { name = _fromName, email = _fromEmail },
                to = new[] { new { email = toEmail } },
                subject = subject,
                htmlContent = body,
                attachment = new[] { new { content = Convert.ToBase64String(pdf), name = fileName } }
            };

            var response = await _httpClient.PostAsJsonAsync("smtp/email", emailRequest);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[EmailService] Brevo rejected {Description} to {Email}. Status: {Status}, Body: {Error}", description, toEmail, response.StatusCode, error);
            }
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailService] Exception sending {Description} to {Email}", description, toEmail);
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
