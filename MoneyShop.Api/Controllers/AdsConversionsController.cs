using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceAdapters.Services.Ads;
using MoneyShop.ServiceInterface.Interfaces.Ads;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// The CSV Google Ads fetches on a schedule ("Încărcări programate" from an HTTPS source) to import
/// qualified leads as conversions. Google authenticates with a user name and password (HTTP Basic),
/// configured as Ads:ImportUser / Ads:ImportPassword; without them the endpoint does not exist.
/// The file holds only click ids and dates, no personal data.
/// </summary>
[ApiController]
[AllowAnonymous]
public class AdsConversionsController : ControllerBase
{
    private readonly IOfflineConversionService _conversions;
    private readonly IConfiguration _configuration;

    public AdsConversionsController(IOfflineConversionService conversions, IConfiguration configuration)
    {
        _conversions = conversions;
        _configuration = configuration;
    }

    [HttpGet("/api/ads/offline-conversions.csv")]
    public async Task<IActionResult> Get()
    {
        var user = _configuration["Ads:ImportUser"];
        var password = _configuration["Ads:ImportPassword"];
        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(password)) return NotFound();
        if (!Authorized(Request.Headers.Authorization.ToString(), user, password))
        {
            Response.Headers.WWWAuthenticate = "Basic realm=\"MoneyShop Ads import\"";
            return Unauthorized();
        }

        var now = DateTime.UtcNow;
        var csv = OfflineConversionService.ToCsv(await _conversions.GetQualifiedAsync(now), placeholderAtUtc: now);
        Response.Headers.CacheControl = "no-store";
        return File(Encoding.UTF8.GetBytes(csv), "text/csv; charset=utf-8", "offline-conversions.csv");
    }

    private static bool Authorized(string header, string user, string password)
    {
        if (!header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase)) return false;
        string decoded;
        try { decoded = Encoding.UTF8.GetString(Convert.FromBase64String(header[6..].Trim())); }
        catch (FormatException) { return false; }
        var expected = Encoding.UTF8.GetBytes($"{user}:{password}");
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(decoded), expected);
    }
}
