using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Oblio;

namespace MoneyShop.Api.Controllers
{
    /// <summary>
    /// Test endpoints for Oblio invoicing — no auth required.
    /// Delete this controller after testing.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class OblioTestController : ControllerBase
    {
        private readonly IOblioApiService _oblioService;

        public OblioTestController(IOblioApiService oblioService)
        {
            _oblioService = oblioService;
        }

        /// <summary>
        /// Test OAuth2 connection — fetches your Oblio companies list
        /// </summary>
        [HttpGet("companies")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                var companies = await _oblioService.GetCompaniesAsync();
                return Ok(new
                {
                    success = true,
                    message = $"Conexiune reusita! {companies.Count} companie(i) gasite.",
                    companies
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = false,
                    message = $"Eroare conectare Oblio: {ex.Message}",
                    hint = "Verifica Oblio:ClientId (email) si Oblio:ClientSecret in user-secrets"
                });
            }
        }

        /// <summary>
        /// Create a test invoice and optionally send it by email via Oblio
        /// </summary>
        [HttpPost("invoice")]
        public async Task<IActionResult> TestInvoice([FromBody] TestInvoiceRequest request)
        {
            try
            {
                // First get the company CIF
                var companies = await _oblioService.GetCompaniesAsync();
                if (companies.Count == 0)
                    return Ok(new { success = false, message = "Nu ai companii in Oblio" });

                var cif = request.Cif ?? companies[0].Cif;

                var invoiceRequest = new OblioInvoiceRequest
                {
                    Client = new OblioClientRequest
                    {
                        Name = request.ClientName ?? "Client Test SRL",
                        Cif = request.ClientCif ?? "",
                        Email = request.ClientEmail,
                        Phone = request.ClientPhone
                    },
                    IssueDate = DateTime.Now.ToString("yyyy-MM-dd"),
                    DueDate = DateTime.Now.AddDays(30).ToString("yyyy-MM-dd"),
                    SeriesName = request.SeriesName ?? "FCT",
                    Language = "RO",
                    Currency = "RON",
                    Products = new List<OblioProductRequest>
                    {
                        new OblioProductRequest
                        {
                            Name = request.ProductName ?? "Serviciu consultanta financiara",
                            Price = request.ProductPrice ?? 100,
                            Quantity = request.ProductQuantity ?? 1,
                            MeasuringUnit = "buc",
                            VatName = "Normala",
                            VatPercentage = 19,
                            VatIncluded = 0,
                            ProductType = "serviciu"
                        }
                    },
                    IssuerName = request.IssuerName ?? "MoneyShop",
                    SendEmail = request.SendEmail ? 1 : null
                };

                var result = await _oblioService.CreateInvoiceAsync(cif, invoiceRequest);

                return Ok(new
                {
                    success = true,
                    message = request.SendEmail
                        ? $"Factura creata si trimisa pe email la {request.ClientEmail}"
                        : "Factura creata cu succes",
                    invoice = result.Data
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = false,
                    message = $"Eroare creare factura: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// List available document series for a company
        /// </summary>
        [HttpGet("vat-rates")]
        public async Task<IActionResult> TestVatRates([FromQuery] string? cif = null)
        {
            try
            {
                var companies = await _oblioService.GetCompaniesAsync();
                if (companies.Count == 0)
                    return Ok(new { success = false, message = "Nu ai companii in Oblio" });

                var useCif = cif ?? companies[0].Cif;
                var vatRates = await _oblioService.GetVatRatesAsync(useCif);

                return Ok(new { success = true, cif = useCif, vatRates });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }
    }

    public class TestInvoiceRequest
    {
        /// <summary>Company CIF (optional — uses first company if empty)</summary>
        public string? Cif { get; set; }
        /// <summary>Invoice series name (e.g. "FCT")</summary>
        public string? SeriesName { get; set; }

        // Client
        public string? ClientName { get; set; }
        public string? ClientCif { get; set; }
        public string? ClientEmail { get; set; }
        public string? ClientPhone { get; set; }

        // Product
        public string? ProductName { get; set; }
        public decimal? ProductPrice { get; set; }
        public decimal? ProductQuantity { get; set; }

        public string? IssuerName { get; set; }

        /// <summary>If true, Oblio will email the invoice to the client (uses Oblio's email, no Brevo credits)</summary>
        public bool SendEmail { get; set; } = false;
    }
}
