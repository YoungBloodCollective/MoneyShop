using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;

namespace MoneyShop.Api.Middleware;

/// <summary>
/// Limits every query on broker-owned records to the signed-in broker's own data.
/// Super admins, anonymous visitors and background work run unscoped.
/// </summary>
public class BrokerScopeMiddleware
{
    private const int NoBroker = -1;
    private static readonly string[] OpenForSuspended = { "/api/auth", "/api/public", "/api/otp", "/api/health" };

    private readonly RequestDelegate _next;

    public BrokerScopeMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, MoneyShopDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true && context.User.IsInRole("Broker"))
        {
            int.TryParse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId);
            var profile = await db.BrokerProfiles.AsNoTracking()
                .Where(p => p.UserId == userId)
                .Select(p => new { p.Id, p.Status })
                .FirstOrDefaultAsync();

            var active = profile is { Status: "Active" };
            db.BrokerScopeId = active ? profile!.Id : NoBroker;

            var path = context.Request.Path.Value ?? string.Empty;
            if (!active && !OpenForSuspended.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { status = "Failure", statusCode = 403, message = "Contul de broker nu este activ" });
                return;
            }
        }

        await _next(context);
    }
}
