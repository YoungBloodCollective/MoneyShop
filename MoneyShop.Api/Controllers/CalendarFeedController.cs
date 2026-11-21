using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Scheduling;

namespace MoneyShop.Api.Controllers;

/// <summary>
/// The broker's appointments as a calendar Outlook / iPhone / Google Calendar subscribe to.
/// The CRM gives the broker their secret link; calendar apps fetch it without signing in.
/// </summary>
[ApiController]
public class CalendarFeedController : BaseController
{
    private readonly ICalendarFeedService _feed;
    private readonly MoneyShopDbContext _db;

    public CalendarFeedController(ICalendarFeedService feed, MoneyShopDbContext db)
    {
        _feed = feed;
        _db = db;
    }

    /// <summary>The signed-in broker's subscription link (their own broker profile only).</summary>
    [HttpGet("/api/crm/calendar-feed")]
    [Authorize(Roles = "Administrator,Broker")]
    public IActionResult MyFeed()
    {
        if (_db.BrokerScopeId is not > 0)
            return NotFound("Calendarul se poate abona doar din CRM-ul unui profil de broker activ.");
        var brokerId = _db.BrokerScopeId.Value;
        var url = $"https://{Request.Host}/api/public/calendar/{brokerId}/{_feed.TokenFor(brokerId)}.ics";
        return Ok(new { url, webcalUrl = "webcal://" + url["https://".Length..] });
    }

    [HttpGet("/api/public/calendar/{brokerId:int}/{token}.ics")]
    [AllowAnonymous]
    [EnableRateLimiting("calendar-feed")]
    public async Task<IActionResult> Feed(int brokerId, string token)
    {
        if (!_feed.IsValidToken(brokerId, token)) return NotFound();
        var ics = await _feed.BuildFeedAsync(brokerId, DateTime.UtcNow);
        if (ics == null) return NotFound();
        Response.Headers.CacheControl = "private, max-age=300";
        return File(System.Text.Encoding.UTF8.GetBytes(ics), "text/calendar; charset=utf-8", "moneyshop.ics");
    }
}
