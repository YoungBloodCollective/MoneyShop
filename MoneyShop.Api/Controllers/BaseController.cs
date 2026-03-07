using Microsoft.AspNetCore.Mvc;
using MoneyShop.Infrastructure.EntityFramework.ApiResponse;
using System.Net;

namespace MoneyShop.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class BaseController : ControllerBase
{
    protected IActionResult Ok(object? value, string message = "Success")
    {
        return base.Ok(new ApiResponse(HttpStatusCode.OK, message, value));
    }

    protected IActionResult Created(object? value, string message = "Created successfully")
    {
        return StatusCode(201, new ApiResponse(HttpStatusCode.Created, message, value));
    }

    protected new IActionResult NotFound(string message = "Resource not found")
    {
        return StatusCode(404, new ApiResponse(HttpStatusCode.NotFound, message));
    }

    protected new IActionResult Unauthorized(string message = "Unauthorized")
    {
        return StatusCode(401, new ApiResponse(HttpStatusCode.Unauthorized, message));
    }

    protected new IActionResult BadRequest(string message = "Bad request")
    {
        return StatusCode(400, new ApiResponse(HttpStatusCode.BadRequest, message));
    }

    protected IActionResult Conflict(string message = "Conflict")
    {
        return StatusCode(409, new ApiResponse(HttpStatusCode.Conflict, message));
    }

    protected IActionResult InternalServerError(string message = "An unexpected error occurred")
    {
        return StatusCode(500, new ApiResponse(HttpStatusCode.InternalServerError, message));
    }
}
