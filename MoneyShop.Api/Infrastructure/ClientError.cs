using MoneyShop.Infrastructure.EntityFramework.Common.Exceptions;

namespace MoneyShop.Api.Infrastructure;

/// <summary>
/// Decides which exception text may be returned to API clients.
/// Mirrors RuntimeExceptionHandlerMiddleware: exceptions the services throw on purpose
/// (argument, invalid operation, unauthorized, validation, not found) keep their message;
/// anything else (SQL, null reference, HTTP client, IO...) is logged server-side and the
/// client gets a generic message, so internals never leak.
/// </summary>
public static class ClientError
{
    public const string GenericMessage = "A apărut o eroare neașteptată. Te rugăm să încerci din nou.";

    public static string For(Exception ex, HttpContext http)
    {
        if (IsUserFacing(ex))
            return ex.Message;

        var logger = http.RequestServices.GetService<ILoggerFactory>()?.CreateLogger("MoneyShop.Api.ClientError");
        logger?.LogError(ex, "Exception hidden from client on {Method} {Path} (trace {TraceId})",
            http.Request.Method, http.Request.Path, http.TraceIdentifier);
        return GenericMessage;
    }

    private static bool IsUserFacing(Exception ex) =>
        ex is ArgumentException
            or InvalidOperationException
            or UnauthorizedAccessException
            or ValidationErrorException
            or NotFoundErrorException;
}
