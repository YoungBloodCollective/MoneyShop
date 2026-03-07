using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MoneyShop.ServiceInterface.Interfaces.Oblio;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MoneyShop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OblioController : BaseController
    {
        private readonly IOblioApiService _oblioService;
        private readonly ILogger<OblioController> _logger;

        public OblioController(IOblioApiService oblioService, ILogger<OblioController> logger)
        {
            _oblioService = oblioService;
            _logger = logger;
        }

        [HttpGet("companies")]
        public async Task<IActionResult> GetCompanies()
        {
            try
            {
                var companies = await _oblioService.GetCompaniesAsync();
                return Ok(companies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Oblio companies");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("vat-rates")]
        public async Task<IActionResult> GetVatRates([FromQuery] string cif)
        {
            if (string.IsNullOrEmpty(cif))
                return BadRequest(new { message = "CIF-ul este obligatoriu" });

            try
            {
                var vatRates = await _oblioService.GetVatRatesAsync(cif);
                return Ok(vatRates);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting VAT rates");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("clients")]
        public async Task<IActionResult> GetClients(
            [FromQuery] string cif, [FromQuery] string? name = null,
            [FromQuery] string? clientCif = null, [FromQuery] int offset = 0)
        {
            if (string.IsNullOrEmpty(cif))
                return BadRequest(new { message = "CIF-ul este obligatoriu" });

            try
            {
                var clients = await _oblioService.GetClientsAsync(cif, name, clientCif, offset);
                return Ok(clients);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting clients");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts(
            [FromQuery] string cif, [FromQuery] string? name = null, [FromQuery] string? code = null,
            [FromQuery] string? management = null, [FromQuery] string? workStation = null, [FromQuery] int offset = 0)
        {
            if (string.IsNullOrEmpty(cif))
                return BadRequest(new { message = "CIF-ul este obligatoriu" });

            try
            {
                var products = await _oblioService.GetProductsAsync(cif, name, code, management, workStation, offset);
                return Ok(products);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting products");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("invoice")]
        public async Task<IActionResult> CreateInvoice([FromQuery] string cif, [FromBody] OblioInvoiceRequest invoiceRequest)
        {
            if (string.IsNullOrEmpty(cif)) return BadRequest(new { message = "CIF-ul este obligatoriu" });
            if (invoiceRequest == null) return BadRequest(new { message = "Datele facturii sunt obligatorii" });

            try
            {
                var result = await _oblioService.CreateInvoiceAsync(cif, invoiceRequest);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating invoice");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("proforma")]
        public async Task<IActionResult> CreateProforma([FromQuery] string cif, [FromBody] OblioProformaRequest proformaRequest)
        {
            if (string.IsNullOrEmpty(cif)) return BadRequest(new { message = "CIF-ul este obligatoriu" });
            if (proformaRequest == null) return BadRequest(new { message = "Datele proformei sunt obligatorii" });

            try
            {
                var result = await _oblioService.CreateProformaAsync(cif, proformaRequest);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating proforma");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("document")]
        public async Task<IActionResult> GetDocument(
            [FromQuery] string cif, [FromQuery] string seriesName, [FromQuery] int number, [FromQuery] string type = "pdf")
        {
            if (string.IsNullOrEmpty(cif) || string.IsNullOrEmpty(seriesName))
                return BadRequest(new { message = "CIF-ul si seria sunt obligatorii" });

            try
            {
                var documentBytes = await _oblioService.GetDocumentAsync(cif, seriesName, number, type);
                return File(documentBytes, type == "pdf" ? "application/pdf" : "application/json",
                    $"document_{seriesName}_{number}.{type}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading document");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("document/cancel")]
        public async Task<IActionResult> CancelDocument(
            [FromQuery] string cif, [FromQuery] string seriesName, [FromQuery] int number, [FromQuery] string type = "invoice")
        {
            if (string.IsNullOrEmpty(cif) || string.IsNullOrEmpty(seriesName))
                return BadRequest(new { message = "CIF-ul si seria sunt obligatorii" });

            try
            {
                var result = await _oblioService.CancelDocumentAsync(cif, seriesName, number, type);
                return Ok(new { success = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling document");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("document/restore")]
        public async Task<IActionResult> RestoreDocument(
            [FromQuery] string cif, [FromQuery] string seriesName, [FromQuery] int number, [FromQuery] string type = "invoice")
        {
            if (string.IsNullOrEmpty(cif) || string.IsNullOrEmpty(seriesName))
                return BadRequest(new { message = "CIF-ul si seria sunt obligatorii" });

            try
            {
                var result = await _oblioService.RestoreDocumentAsync(cif, seriesName, number, type);
                return Ok(new { success = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error restoring document");
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("document/delete")]
        public async Task<IActionResult> DeleteDocument(
            [FromQuery] string cif, [FromQuery] string seriesName, [FromQuery] int number, [FromQuery] string type = "invoice")
        {
            if (string.IsNullOrEmpty(cif) || string.IsNullOrEmpty(seriesName))
                return BadRequest(new { message = "CIF-ul si seria sunt obligatorii" });

            try
            {
                var result = await _oblioService.DeleteDocumentAsync(cif, seriesName, number, type);
                return Ok(new { success = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting document");
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
