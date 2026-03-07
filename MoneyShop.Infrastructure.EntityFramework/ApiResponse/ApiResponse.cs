using System.Net;

namespace MoneyShop.Infrastructure.EntityFramework.ApiResponse;

public class ApiResponse
{
    public string Status { get; set; }
    public HttpStatusCode StatusCode { get; set; }
    public string Message { get; set; }
    public object? Data { get; set; }

    public ApiResponse(HttpStatusCode statusCode, string message, object? data = null)
    {
        StatusCode = statusCode;
        Message = message;
        Data = data;
        Status = (int)statusCode >= 200 && (int)statusCode < 300 ? "Success" : "Failure";
    }
}
