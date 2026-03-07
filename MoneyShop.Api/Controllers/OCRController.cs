using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OCRController : BaseController
    {
        [HttpPost("process-id")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ProcessIdCard([FromForm] OcrRequest request)
        {
            var image = request.Image;
            if (image == null || image.Length == 0)
                return BadRequest(new { message = "No image uploaded" });

            // TODO: Implement OCR using Azure Computer Vision or Tesseract
            var mockData = new
            {
                nume = "Ion",
                prenume = "Popescu",
                cnp = "1234567890123",
                serie = "AB",
                numar = "123456",
                adresa = "Str. Exemplu, Nr. 1, Bucuresti"
            };

            return Ok(mockData);
        }
    }

    public class OcrRequest
    {
        public IFormFile Image { get; set; } = null!;
    }
}
