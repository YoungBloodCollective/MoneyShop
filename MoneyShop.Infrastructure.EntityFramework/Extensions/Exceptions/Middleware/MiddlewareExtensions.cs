using Microsoft.AspNetCore.Builder;

namespace MoneyShop.Infrastructure.EntityFramework.Extensions.Exceptions.Middleware;

public static class MiddlewareExtensions
{
    public static IApplicationBuilder UseRuntimeExceptionHandler(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RuntimeExceptionHandlerMiddleware>();
    }
}
