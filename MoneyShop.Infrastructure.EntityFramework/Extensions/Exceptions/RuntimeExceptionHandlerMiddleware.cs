using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MoneyShop.Infrastructure.EntityFramework.ApiResponse;
using MoneyShop.Infrastructure.EntityFramework.Common.Exceptions;

namespace MoneyShop.Infrastructure.EntityFramework.Extensions.Exceptions;

public class RuntimeExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RuntimeExceptionHandlerMiddleware> _logger;

    public RuntimeExceptionHandlerMiddleware(RequestDelegate next, ILogger<RuntimeExceptionHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = exception switch
        {
            ArgumentException => (HttpStatusCode.Forbidden, exception.Message),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, exception.Message),
            ValidationErrorException => (HttpStatusCode.BadRequest, exception.Message),
            NotFoundErrorException => (HttpStatusCode.NotFound, exception.Message),
            InvalidOperationException => (HttpStatusCode.BadRequest, exception.Message),
            TimeoutException => (HttpStatusCode.GatewayTimeout, "Request timed out"),
            TaskCanceledException => (HttpStatusCode.RequestTimeout, "Request was cancelled"),
            FileNotFoundException => (HttpStatusCode.NotFound, "Resource not found"),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred")
        };

        context.Response.StatusCode = (int)statusCode;
        var response = new ApiResponse.ApiResponse(statusCode, message);
        var json = JsonSerializer.Serialize(response);
        await context.Response.WriteAsync(json);
    }
}
