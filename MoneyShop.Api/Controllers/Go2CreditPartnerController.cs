using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MoneyShop.Api.Controllers
{
    // DTO classes

    #region Request DTOs

    public class CreateInrolareRequest
    {
        [Required] public string Nume { get; set; } = null!;
        [Required] public string Prenume { get; set; } = null!;

        [Required]
        [RegularExpression(@"^\d{13}$", ErrorMessage = "CNP trebuie sa aiba exact 13 cifre")]
        public string Cnp { get; set; } = null!;

        [Required]
        [RegularExpression(@"^07\d{8}$", ErrorMessage = "Telefon invalid (format: 07xxxxxxxx)")]
        public string Telefon { get; set; } = null!;

        public string? Email { get; set; }

        [Required] public string Adresa { get; set; } = null!;

        [Required]
        [JsonPropertyName("ci_serie")]
        [RegularExpression(@"^[A-Z]{2}$", ErrorMessage = "CI serie = 2 litere majuscule")]
        public string CiSerie { get; set; } = null!;

        [Required]
        [JsonPropertyName("ci_numar")]
        [RegularExpression(@"^\d{6}$", ErrorMessage = "CI numar = 6 cifre")]
        public string CiNumar { get; set; } = null!;

        [JsonPropertyName("ci_data_eliberarii")]
        public string? CiDataEliberarii { get; set; }

        [JsonPropertyName("ci_data_expirarii")]
        public string? CiDataExpirarii { get; set; }

        [JsonPropertyName("partner_reference")]
        public string? PartnerReference { get; set; }
    }

    public class SignAnafRequest
    {
        [Required]
        [JsonPropertyName("return_url")]
        public string ReturnUrl { get; set; } = null!;

        [JsonPropertyName("pdf_base64")]
        public string? PdfBase64 { get; set; }
    }

    public class WithDocumentsJsonRequest
    {
        [JsonPropertyName("ci_fata_base64")]
        public string? CiFataBase64 { get; set; }

        [JsonPropertyName("ci_spate_base64")]
        public string? CiSpateBase64 { get; set; }

        public string? Email { get; set; }

        [JsonPropertyName("partner_reference")]
        public string? PartnerReference { get; set; }
    }

    public class LivenessRequest
    {
        [Required]
        [JsonPropertyName("selfie_base64")]
        public string SelfieBase64 { get; set; } = null!;
    }

    public class RegisterWebhookRequest
    {
        [Required] public string Url { get; set; } = null!;
        [Required] public List<string> Events { get; set; } = null!;
        public string? Secret { get; set; }
    }

    #endregion

    [ApiController]
    [Route("api/go2credit")]
    [AllowAnonymous]
    [Produces("application/json")]
    public class Go2CreditPartnerController : BaseController
    {
        private const string ApiKey =
            "pk_c06f2cd186ef799958820e24da4cac597841295b68a419601e878ced33955cb6adcdec52ca0aaaca94126fcf3d41565c";

        private const string BaseUrl = "https://go2credit.ro/api/partner";

        private readonly IHttpClientFactory _httpClientFactory;

        public Go2CreditPartnerController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        private HttpClient CreateClient()
        {
            var client = _httpClientFactory.CreateClient("Go2Credit");
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);
            return client;
        }

        private async Task<IActionResult> Forward(HttpResponseMessage resp, string endpoint)
        {
            var statusCode = (int)resp.StatusCode;
            var rawBody = await resp.Content.ReadAsStringAsync();
            var success = resp.IsSuccessStatusCode;

            object? data = null;
            if (!string.IsNullOrWhiteSpace(rawBody))
            {
                try { data = JsonSerializer.Deserialize<JsonElement>(rawBody); }
                catch { data = rawBody.Length > 500 ? rawBody.Substring(0, 500) + "... [truncated]" : rawBody; }
            }

            return StatusCode(statusCode, new
            {
                success, statusCode,
                message = success ? "OK" : $"Go2Credit returned {statusCode}",
                endpoint = $"{BaseUrl}/{endpoint}", data
            });
        }

        private IActionResult ConnectionError(Exception ex, string endpoint)
        {
            var fullUrl = $"{BaseUrl}/{endpoint}";
            var errorType = ex switch
            {
                TaskCanceledException => "TIMEOUT - Go2Credit did not respond within 30s",
                HttpRequestException httpEx => $"CONNECTION ERROR - {httpEx.Message}",
                _ => $"UNEXPECTED ERROR - {ex.GetType().Name}: {ex.Message}"
            };

            return StatusCode(502, new
            {
                success = false, statusCode = 502, message = errorType,
                endpoint = fullUrl, detail = ex.InnerException?.Message,
                help = "Check that Go2Credit server is reachable. Try: curl -I " + fullUrl
            });
        }

        [HttpPost("inrolari")]
        [ProducesResponseType(201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(502)]
        public async Task<IActionResult> CreateInrolare([FromBody] CreateInrolareRequest req)
        {
            var endpoint = "inrolari";
            try
            {
                var payload = new Dictionary<string, object?>
                {
                    ["nume"] = req.Nume, ["prenume"] = req.Prenume, ["cnp"] = req.Cnp,
                    ["telefon"] = req.Telefon, ["email"] = req.Email, ["adresa"] = req.Adresa,
                    ["ci_serie"] = req.CiSerie, ["ci_numar"] = req.CiNumar,
                    ["ci_data_eliberarii"] = req.CiDataEliberarii, ["ci_data_expirarii"] = req.CiDataExpirarii,
                    ["partner_reference"] = req.PartnerReference
                };

                var filtered = payload.Where(kv => kv.Value != null).ToDictionary(kv => kv.Key, kv => kv.Value);
                var json = new StringContent(JsonSerializer.Serialize(filtered), Encoding.UTF8, "application/json");

                using var client = CreateClient();
                var resp = await client.PostAsync($"{BaseUrl}/{endpoint}", json);
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        private static readonly string[] AllowedImageTypes = { "image/jpeg", "image/jpg" };
        private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg" };

        private static bool IsJpegOrJpg(IFormFile file)
        {
            var ct = file.ContentType?.ToLowerInvariant();
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            return (ct != null && AllowedImageTypes.Contains(ct)) || (ext != null && AllowedExtensions.Contains(ext));
        }

        private static async Task<string> ToBase64Async(IFormFile file)
        {
            await using var stream = file.OpenReadStream();
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            return Convert.ToBase64String(ms.ToArray());
        }

        [HttpPost("inrolari/with-documents-json")]
        [ProducesResponseType(201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(422)]
        [ProducesResponseType(502)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> InrolariWithDocumentsJsonFromFiles(
            IFormFile? ci_fata, IFormFile? ci_spate, [FromForm] string? email, [FromForm] string? partner_reference)
        {
            if (ci_fata == null && ci_spate == null)
                return BadRequest(new { success = false, statusCode = 400, message = "Cel putin un fisier (ci_fata sau ci_spate) este necesar." });

            if (ci_fata != null && !IsJpegOrJpg(ci_fata))
                return BadRequest(new { success = false, statusCode = 400, message = "ci_fata trebuie sa fie JPG sau JPEG." });
            if (ci_spate != null && !IsJpegOrJpg(ci_spate))
                return BadRequest(new { success = false, statusCode = 400, message = "ci_spate trebuie sa fie JPG sau JPEG." });

            string? ciFataB64 = null, ciSpateB64 = null;
            if (ci_fata != null) ciFataB64 = await ToBase64Async(ci_fata);
            if (ci_spate != null) ciSpateB64 = await ToBase64Async(ci_spate);

            return await SendWithDocumentsToGo2Credit(ciFataB64, ciSpateB64, email, partner_reference);
        }

        private async Task<IActionResult> SendWithDocumentsToGo2Credit(string? ciFataBase64, string? ciSpateBase64, string? email, string? partnerReference)
        {
            var endpoint = "inrolari/with-documents";
            try
            {
                var payload = new Dictionary<string, object?>
                {
                    ["ci_fata_base64"] = ciFataBase64, ["ci_spate_base64"] = ciSpateBase64,
                    ["email"] = email, ["partner_reference"] = partnerReference
                };
                var filtered = payload.Where(kv => kv.Value != null).ToDictionary(kv => kv.Key, kv => kv.Value!);
                var json = new StringContent(JsonSerializer.Serialize(filtered), Encoding.UTF8, "application/json");

                using var client = CreateClient();
                var resp = await client.PostAsync($"{BaseUrl}/{endpoint}", json);
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        [HttpPost("inrolari/{id}/liveness")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(502)]
        public async Task<IActionResult> Liveness([FromRoute] string id, [FromBody] LivenessRequest req)
        {
            var endpoint = $"inrolari/{id}/liveness";
            try
            {
                var payload = new Dictionary<string, string> { ["selfie_base64"] = req.SelfieBase64 };
                var json = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                using var client = CreateClient();
                var resp = await client.PostAsync($"{BaseUrl}/{endpoint}", json);
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        [HttpGet("inrolari/{id}/acord-anaf")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(502)]
        [Produces("application/pdf")]
        public async Task<IActionResult> GetAcordAnaf([FromRoute] string id)
        {
            var endpoint = $"inrolari/{id}/acord-anaf";
            try
            {
                using var client = CreateClient();
                var resp = await client.GetAsync($"{BaseUrl}/{endpoint}");
                if (!resp.IsSuccessStatusCode)
                {
                    var body = await resp.Content.ReadAsStringAsync();
                    return StatusCode((int)resp.StatusCode, new { success = false, statusCode = (int)resp.StatusCode, message = body, endpoint = $"{BaseUrl}/{endpoint}" });
                }
                var bytes = await resp.Content.ReadAsByteArrayAsync();
                var contentType = resp.Content.Headers.ContentType?.ToString() ?? "application/pdf";
                return File(bytes, contentType, $"acord-anaf-{id}.pdf");
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        [HttpPost("inrolari/{id}/sign-anaf")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(502)]
        public async Task<IActionResult> SignAnaf([FromRoute] string id, [FromBody] SignAnafRequest req)
        {
            var endpoint = $"inrolari/{id}/sign-anaf";
            try
            {
                var payload = new Dictionary<string, object?> { ["return_url"] = req.ReturnUrl, ["pdf_base64"] = req.PdfBase64 };
                var filtered = payload.Where(kv => kv.Value != null).ToDictionary(kv => kv.Key, kv => kv.Value!);
                var json = new StringContent(JsonSerializer.Serialize(filtered), Encoding.UTF8, "application/json");

                using var client = CreateClient();
                var resp = await client.PostAsync($"{BaseUrl}/{endpoint}", json);
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        [HttpGet("inrolari/{id}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(502)]
        public async Task<IActionResult> GetInrolare([FromRoute] string id)
        {
            var endpoint = $"inrolari/{id}";
            try
            {
                using var client = CreateClient();
                var resp = await client.GetAsync($"{BaseUrl}/{endpoint}");
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        [HttpGet("inrolari/{id}/anaf")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        [ProducesResponseType(502)]
        public async Task<IActionResult> GetAnaf([FromRoute] string id)
        {
            var endpoint = $"inrolari/{id}/anaf";
            try
            {
                using var client = CreateClient();
                var resp = await client.GetAsync($"{BaseUrl}/{endpoint}");
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        [HttpPost("inrolari/{id}/documents")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(502)]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadDocuments([FromRoute] string id, IFormFile? ci_fata, IFormFile? ci_spate)
        {
            var endpoint = $"inrolari/{id}/documents";
            try
            {
                if (ci_fata == null && ci_spate == null)
                    return BadRequest(new { success = false, statusCode = 400, message = "Cel putin un fisier (ci_fata sau ci_spate) este necesar." });

                using var client = CreateClient();
                using var form = new MultipartFormDataContent();
                if (ci_fata != null)
                {
                    var c1 = new StreamContent(ci_fata.OpenReadStream());
                    c1.Headers.ContentType = new MediaTypeHeaderValue(ci_fata.ContentType);
                    form.Add(c1, "ci_fata", ci_fata.FileName);
                }
                if (ci_spate != null)
                {
                    var c2 = new StreamContent(ci_spate.OpenReadStream());
                    c2.Headers.ContentType = new MediaTypeHeaderValue(ci_spate.ContentType);
                    form.Add(c2, "ci_spate", ci_spate.FileName);
                }
                var resp = await client.PostAsync($"{BaseUrl}/{endpoint}", form);
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        [HttpPost("webhooks")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        [ProducesResponseType(502)]
        public async Task<IActionResult> RegisterWebhook([FromBody] RegisterWebhookRequest req)
        {
            var endpoint = "webhooks";
            try
            {
                var payload = new Dictionary<string, object?> { ["url"] = req.Url, ["events"] = req.Events, ["secret"] = req.Secret };
                var filtered = payload.Where(kv => kv.Value != null).ToDictionary(kv => kv.Key, kv => kv.Value!);
                var json = new StringContent(JsonSerializer.Serialize(filtered), Encoding.UTF8, "application/json");
                using var client = CreateClient();
                var resp = await client.PostAsync($"{BaseUrl}/{endpoint}", json);
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, endpoint); }
        }

        [HttpGet("webhooks")]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(502)]
        public async Task<IActionResult> ListWebhooks([FromQuery] string? id, [FromQuery] bool deliveries = false)
        {
            var query = new List<string>();
            if (!string.IsNullOrEmpty(id)) query.Add($"id={Uri.EscapeDataString(id)}");
            if (deliveries) query.Add("deliveries=true");
            var qs = query.Count > 0 ? "?" + string.Join("&", query) : "";
            var endpoint = "webhooks" + qs;
            try
            {
                using var client = CreateClient();
                var resp = await client.GetAsync($"{BaseUrl}/webhooks{qs}");
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, "webhooks"); }
        }

        [HttpDelete("webhooks")]
        [ProducesResponseType(200)]
        [ProducesResponseType(401)]
        [ProducesResponseType(404)]
        [ProducesResponseType(502)]
        public async Task<IActionResult> DeleteWebhook([FromQuery] string id)
        {
            var endpoint = $"webhooks?id={Uri.EscapeDataString(id)}";
            try
            {
                using var client = CreateClient();
                var resp = await client.DeleteAsync($"{BaseUrl}/webhooks?id={Uri.EscapeDataString(id)}");
                return await Forward(resp, endpoint);
            }
            catch (Exception ex) { return ConnectionError(ex, "webhooks"); }
        }
    }
}
