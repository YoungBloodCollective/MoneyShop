using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.ServiceAdapters.Services.Scheduling.Outlook;

/// <summary>
/// Microsoft Graph calendar calls with the client-credentials flow (no user sign-in). The tenant limits
/// which mailboxes the app may open (Exchange application access policy); the app never sends invitations.
/// MoneyShop's own events carry two extended properties: the appointment id and a version hash.
/// Registered as a singleton so the access token is reused.
/// </summary>
public class GraphOutlookCalendar : IOutlookCalendar
{
    private const string PropertySet = "{6f5a2c1e-3b7d-4e8a-9c41-2d6b8e0f7a35}";
    public const string AppointmentIdProperty = "String " + PropertySet + " Name MoneyShopAppointmentId";
    public const string VersionProperty = "String " + PropertySet + " Name MoneyShopVersion";
    private const string GraphBase = "https://graph.microsoft.com/v1.0";

    private readonly HttpClient _http;
    private readonly ILogger<GraphOutlookCalendar> _logger;
    private readonly IConfiguration _configuration;
    private readonly string? _tenantId;
    private readonly string? _clientId;
    private readonly string? _clientSecret;
    private readonly string _mailboxDomain;

    private readonly SemaphoreSlim _tokenLock = new(1, 1);
    private string? _token;
    private DateTime _tokenExpiresUtc;

    public GraphOutlookCalendar(HttpClient http, IConfiguration configuration, ILogger<GraphOutlookCalendar> logger)
    {
        _http = http;
        _logger = logger;
        _configuration = configuration;
        _tenantId = configuration["Graph:TenantId"];
        _clientId = configuration["Graph:ClientId"];
        _clientSecret = configuration["Graph:ClientSecret"];
        _mailboxDomain = (configuration["Graph:MailboxDomain"] ?? "moneyshop.ro").Trim().TrimStart('@');
        Enabled = !string.Equals(configuration["Graph:Enabled"], "false", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(_tenantId) && !string.IsNullOrWhiteSpace(_clientId) && !string.IsNullOrWhiteSpace(_clientSecret);
    }

    public bool Enabled { get; }

    public string? MailboxFor(string? slug, string? notificationEmail, string? publicEmail) =>
        OutlookMailbox.Resolve(_configuration, _mailboxDomain, slug, notificationEmail, publicEmail);

    public async Task<List<OutlookCalendarItem>> ListAsync(string mailbox, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default)
    {
        var expand = Uri.EscapeDataString($"singleValueExtendedProperties($filter=id eq '{AppointmentIdProperty}' or id eq '{VersionProperty}')");
        string? url = $"{GraphBase}/users/{Uri.EscapeDataString(mailbox)}/calendarView" +
                      $"?startDateTime={Iso(fromUtc)}&endDateTime={Iso(toUtc)}" +
                      "&$select=id,start,end,showAs,isCancelled&$top=200&$expand=" + expand;
        var items = new List<OutlookCalendarItem>();
        for (var page = 0; url != null && page < 20; page++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("Prefer", "outlook.timezone=\"UTC\"");
            using var response = await SendAsync(request, ct);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            foreach (var e in doc.RootElement.GetProperty("value").EnumerateArray())
                items.Add(ParseItem(e));
            url = doc.RootElement.TryGetProperty("@odata.nextLink", out var next) ? next.GetString() : null;
        }
        return items;
    }

    public async Task CreateAsync(string mailbox, OutlookEvent ev, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{GraphBase}/users/{Uri.EscapeDataString(mailbox)}/events")
        {
            Content = JsonContent.Create(Body(ev)),
        };
        using var response = await SendAsync(request, ct);
    }

    public async Task UpdateAsync(string mailbox, string eventId, OutlookEvent ev, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Patch, $"{GraphBase}/users/{Uri.EscapeDataString(mailbox)}/events/{Uri.EscapeDataString(eventId)}")
        {
            Content = JsonContent.Create(Body(ev)),
        };
        using var response = await SendAsync(request, ct);
    }

    public async Task DeleteAsync(string mailbox, string eventId, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Delete, $"{GraphBase}/users/{Uri.EscapeDataString(mailbox)}/events/{Uri.EscapeDataString(eventId)}");
        using var response = await SendAsync(request, ct, allowNotFound: true);
    }

    private static object Body(OutlookEvent ev) => new
    {
        subject = ev.Subject,
        body = new { contentType = "text", content = ev.Body },
        start = new { dateTime = GraphTime(ev.StartUtc), timeZone = "UTC" },
        end = new { dateTime = GraphTime(ev.EndUtc), timeZone = "UTC" },
        showAs = "busy",
        isReminderOn = true,
        reminderMinutesBeforeStart = 10,
        singleValueExtendedProperties = new[]
        {
            new { id = AppointmentIdProperty, value = ev.AppointmentId.ToString(CultureInfo.InvariantCulture) },
            new { id = VersionProperty, value = ev.Version },
        },
    };

    /// <summary>Reads one event of a calendarView response (times requested in UTC).</summary>
    public static OutlookCalendarItem ParseItem(JsonElement e)
    {
        int? appointmentId = null;
        string? version = null;
        if (e.TryGetProperty("singleValueExtendedProperties", out var props) && props.ValueKind == JsonValueKind.Array)
        {
            foreach (var p in props.EnumerateArray())
            {
                var id = p.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "";
                var value = p.TryGetProperty("value", out var valueEl) ? valueEl.GetString() : null;
                if (id.EndsWith("MoneyShopAppointmentId", StringComparison.OrdinalIgnoreCase) && int.TryParse(value, out var parsed)) appointmentId = parsed;
                else if (id.EndsWith("MoneyShopVersion", StringComparison.OrdinalIgnoreCase)) version = value;
            }
        }
        return new OutlookCalendarItem(
            e.GetProperty("id").GetString() ?? "",
            appointmentId,
            version,
            ParseUtc(e.GetProperty("start")),
            ParseUtc(e.GetProperty("end")),
            e.TryGetProperty("showAs", out var showAs) ? showAs.GetString() ?? "busy" : "busy",
            e.TryGetProperty("isCancelled", out var cancelled) && cancelled.ValueKind == JsonValueKind.True);
    }

    private static DateTime ParseUtc(JsonElement time)
    {
        var raw = time.GetProperty("dateTime").GetString() ?? "";
        var value = DateTime.Parse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
        return DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    private static string Iso(DateTime utc) =>
        Uri.EscapeDataString(DateTime.SpecifyKind(utc, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture));

    private static string GraphTime(DateTime utc) =>
        DateTime.SpecifyKind(utc, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss", CultureInfo.InvariantCulture);

    private async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct, bool allowNotFound = false)
    {
        if (!Enabled) throw new InvalidOperationException("Outlook calendar sync is not configured.");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await TokenAsync(ct));
        var response = await _http.SendAsync(request, ct);
        if (response.IsSuccessStatusCode || (allowNotFound && response.StatusCode == HttpStatusCode.NotFound)) return response;

        var status = response.StatusCode;
        var detail = await response.Content.ReadAsStringAsync(ct);
        response.Dispose();
        if (status == HttpStatusCode.Unauthorized) _token = null;
        throw new HttpRequestException($"Graph {request.Method} failed: {(int)status} {Truncate(detail)}", null, status);
    }

    private async Task<string> TokenAsync(CancellationToken ct)
    {
        if (_token != null && DateTime.UtcNow < _tokenExpiresUtc) return _token;
        await _tokenLock.WaitAsync(ct);
        try
        {
            if (_token != null && DateTime.UtcNow < _tokenExpiresUtc) return _token;
            using var form = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = _clientId!,
                ["client_secret"] = _clientSecret!,
                ["scope"] = "https://graph.microsoft.com/.default",
                ["grant_type"] = "client_credentials",
            });
            using var response = await _http.PostAsync($"https://login.microsoftonline.com/{Uri.EscapeDataString(_tenantId!)}/oauth2/v2.0/token", form, ct);
            var json = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                // The error body names the problem (e.g. an expired secret); it never echoes the secret.
                _logger.LogError("Graph token request failed: {Status} {Body}", (int)response.StatusCode, Truncate(json));
                throw new HttpRequestException($"Graph token request failed: {(int)response.StatusCode}");
            }
            using var doc = JsonDocument.Parse(json);
            _token = doc.RootElement.GetProperty("access_token").GetString();
            var seconds = doc.RootElement.TryGetProperty("expires_in", out var exp) ? exp.GetInt32() : 3600;
            _tokenExpiresUtc = DateTime.UtcNow.AddSeconds(Math.Max(60, seconds - 300));
            return _token!;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private static string Truncate(string value) => value.Length <= 400 ? value : value[..400];
}

/// <summary>Which Microsoft 365 mailbox belongs to a broker.</summary>
public static class OutlookMailbox
{
    /// <summary>
    /// Graph:Mailboxes:{slug} wins; otherwise the broker's notification or public email, but only in the
    /// company domain (outside addresses have no mailbox in the tenant).
    /// </summary>
    public static string? Resolve(IConfiguration configuration, string domain, string? slug, string? notificationEmail, string? publicEmail)
    {
        if (!string.IsNullOrWhiteSpace(slug))
        {
            var mapped = configuration[$"Graph:Mailboxes:{slug}"];
            if (!string.IsNullOrWhiteSpace(mapped)) return mapped.Trim();
        }
        foreach (var email in new[] { notificationEmail, publicEmail })
        {
            if (string.IsNullOrWhiteSpace(email)) continue;
            var trimmed = email.Trim();
            if (trimmed.EndsWith("@" + domain, StringComparison.OrdinalIgnoreCase)) return trimmed;
        }
        return null;
    }
}
