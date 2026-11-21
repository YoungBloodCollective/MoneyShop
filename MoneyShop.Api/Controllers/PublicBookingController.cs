using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoneyShop.ServiceAdapters.Services.Otp;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// Public call booking: free times for moneyshop.ro, and the private link from the confirmation
/// email (confirm / move / cancel). The link token is the only credential; it is never stored in clear.
/// </summary>
[ApiController]
[Route("api/public/booking")]
[AllowAnonymous]
[EnableRateLimiting("public-booking")]
public class PublicBookingController : BaseController
{
    private readonly IPublicBookingService _booking;
    private readonly IBrokerProfileService _brokerProfiles;
    private readonly EmailService _email;
    private readonly IConfiguration _configuration;

    public PublicBookingController(IPublicBookingService booking, IBrokerProfileService brokerProfiles, EmailService email, IConfiguration configuration)
    {
        _booking = booking;
        _brokerProfiles = brokerProfiles;
        _email = email;
        _configuration = configuration;
    }

    [HttpGet("slots")]
    public async Task<IActionResult> Slots([FromQuery] string? brokerSlug = null) =>
        Ok(new { durationMinutes = _booking.SlotDurationMinutes, days = await _booking.GetSlotsAsync(brokerSlug, DateTime.UtcNow) });

    [HttpGet("{token}")]
    public async Task<IActionResult> Get(string token)
    {
        var booking = await _booking.GetByTokenAsync(token, DateTime.UtcNow);
        return booking == null ? NotFound("Linkul nu este valid.") : Ok(booking);
    }

    [HttpPost("{token}/confirm")]
    public async Task<IActionResult> Confirm(string token) =>
        Respond(await _booking.ConfirmAsync(token, DateTime.UtcNow), "confirmat");

    [HttpPost("{token}/cancel")]
    public async Task<IActionResult> Cancel(string token) =>
        Respond(await _booking.CancelAsync(token, DateTime.UtcNow), "anulat");

    [HttpPost("{token}/reschedule")]
    public async Task<IActionResult> Reschedule(string token, [FromBody] PublicRescheduleRequest request) =>
        Respond(await _booking.RescheduleAsync(token, request.ScheduledAt.ToUniversalTime(), DateTime.UtcNow), "mutat");

    private IActionResult Respond(BookingActionResult result, string change)
    {
        switch (result.Error)
        {
            case BookingActionError.NotFound: return NotFound("Linkul nu este valid.");
            case BookingActionError.Cancelled: return Conflict("Programarea a fost deja anulată.");
            case BookingActionError.Past: return Conflict("Ora programării a trecut.");
            case BookingActionError.SlotTaken: return StatusCode(409, new { code = "slot_taken", message = "Intervalul ales nu mai este disponibil. Alege altă oră." });
        }

        // The broker hears about it; a request still in the Super Admin inbox goes to the default address.
        var to = _brokerProfiles.GetNotificationEmail(result.BrokerProfileId)
            ?? _configuration["Brokers:DefaultNotificationEmail"] ?? "alex.moore@moneyshop.ro";
        var booking = result.Booking!;
        if (!string.IsNullOrWhiteSpace(to))
        {
            var root = _configuration["Brokers:RootDomain"] ?? "moneyshop.ro";
            var path = result.BrokerProfileId.HasValue ? "/crm/programari" : "/admin/de-atribuit";
            _ = _email.SendBookingChangeToBrokerAsync(to, booking.FirstName, change, booking.ScheduledAtUtc, booking.DurationMinutes, $"https://{root}{path}");
        }
        return Ok(booking);
    }
}

public class PublicRescheduleRequest
{
    public DateTime ScheduledAt { get; set; }
}
