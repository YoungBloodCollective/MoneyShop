using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;

namespace MoneyShop.Api.Middleware;

/// <summary>
/// Limits every query on broker-owned records to the signed-in broker's own data.
/// Super admins, anonymous visitors and background work run unscoped — except a Super Admin
/// who is also a broker and is working in their own CRM (the web app sends
/// <c>X-MoneyShop-Workspace: crm</c> from /crm): then they see only their own broker profile's data.
/// </summary>
public class BrokerScopeMiddleware
{
    public const string WorkspaceHeader = "X-MoneyShop-Workspace";
    private const int NoBroker = -1;
    private static readonly string[] OpenForSuspended = { "/api/auth", "/api/public", "/api/otp", "/api/health" };

    private readonly RequestDelegate _next;

    public BrokerScopeMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, MoneyShopDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            int? actorId = int.TryParse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var parsedId) ? parsedId : null;
            db.AuditActor = (actorId, context.User.FindFirst(ClaimTypes.Role)?.Value, context.Connection.RemoteIpAddress?.ToString());
        }

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

        else if (context.User.Identity?.IsAuthenticated == true
                 && context.User.IsInRole("Administrator")
                 && string.Equals(context.Request.Headers[WorkspaceHeader].ToString(), "crm", StringComparison.OrdinalIgnoreCase))
        {
            // Super Admin in "my CRM": scope to their own active broker profile, if they have one.
            int.TryParse(context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId);
            var ownProfileId = await db.BrokerProfiles.AsNoTracking()
                .Where(p => p.UserId == userId && p.Status == "Active")
                .Select(p => (int?)p.Id)
                .FirstOrDefaultAsync();
            if (ownProfileId.HasValue) db.BrokerScopeId = ownProfileId.Value;
        }

        await _next(context);
    }
}
