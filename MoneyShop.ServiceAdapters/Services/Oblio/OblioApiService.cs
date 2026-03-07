using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.ServiceInterface.Interfaces.Oblio;

namespace MoneyShop.ServiceAdapters.Services.Oblio;

public class OblioApiService : IOblioApiService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OblioApiService> _logger;
    private string? _accessToken;
    private DateTime? _tokenExpiresAt;

    private const string BaseUrl = "https://www.oblio.eu/api";
    private const string TokenEndpoint = "/authorize/token";

    public OblioApiService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<OblioApiService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _httpClient.BaseAddress = new Uri(BaseUrl);
    }

    public async Task<string> GetAccessTokenAsync()
    {
        if (_accessToken != null && _tokenExpiresAt.HasValue && DateTime.UtcNow < _tokenExpiresAt.Value.AddMinutes(-5))
        {
            return _accessToken;
        }

        var clientId = _configuration["Oblio:ClientId"];
        var clientSecret = _configuration["Oblio:ClientSecret"];

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        {
            throw new InvalidOperationException("Oblio ClientId si ClientSecret trebuie configurate in appsettings.json");
        }

        try
        {
            var requestContent = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret)
            });

            var response = await _httpClient.PostAsync(TokenEndpoint, requestContent);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadAsStringAsync();
            var tokenResponse = JsonSerializer.Deserialize<OblioTokenResponse>(responseContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (tokenResponse?.AccessToken == null)
            {
                throw new Exception("Nu s-a putut obtine token-ul de acces de la Oblio");
            }

            _accessToken = tokenResponse.AccessToken;
            var expiresIn = int.TryParse(tokenResponse.ExpiresIn, out var seconds) ? seconds : 3600;
            _tokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);

            _logger.LogInformation("Token Oblio obtinut cu succes. Expira la: {ExpiresAt}", _tokenExpiresAt);

            return _accessToken;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Eroare la obtinerea token-ului Oblio");
            throw;
        }
    }

    public async Task<List<OblioCompany>> GetCompaniesAsync()
    {
        var token = await GetAccessTokenAsync();
        var response = await GetAsync<OblioResponse<List<OblioCompany>>>("/nomenclature/companies", token);
        return response?.Data ?? new List<OblioCompany>();
    }

    public async Task<List<OblioVatRate>> GetVatRatesAsync(string cif)
    {
        var token = await GetAccessTokenAsync();
        var response = await GetAsync<OblioResponse<List<OblioVatRate>>>($"/nomenclature/vat_rates?cif={cif}", token);
        return response?.Data ?? new List<OblioVatRate>();
    }

    public async Task<List<OblioClient>> GetClientsAsync(string cif, string? name = null, string? clientCif = null, int offset = 0)
    {
        var token = await GetAccessTokenAsync();
        var queryParams = $"cif={cif}&offset={offset}";
        if (!string.IsNullOrEmpty(name)) queryParams += $"&name={Uri.EscapeDataString(name)}";
        if (!string.IsNullOrEmpty(clientCif)) queryParams += $"&clientCif={clientCif}";

        var response = await GetAsync<OblioResponse<List<OblioClient>>>($"/nomenclature/clients?{queryParams}", token);
        return response?.Data ?? new List<OblioClient>();
    }

    public async Task<List<OblioProduct>> GetProductsAsync(string cif, string? name = null, string? code = null, string? management = null, string? workStation = null, int offset = 0)
    {
        var token = await GetAccessTokenAsync();
        var queryParams = $"cif={cif}&offset={offset}";
        if (!string.IsNullOrEmpty(name)) queryParams += $"&name={Uri.EscapeDataString(name)}";
        if (!string.IsNullOrEmpty(code)) queryParams += $"&code={Uri.EscapeDataString(code)}";
        if (!string.IsNullOrEmpty(management)) queryParams += $"&management={Uri.EscapeDataString(management)}";
        if (!string.IsNullOrEmpty(workStation)) queryParams += $"&workStation={Uri.EscapeDataString(workStation)}";

        var response = await GetAsync<OblioResponse<List<OblioProduct>>>($"/nomenclature/products?{queryParams}", token);
        return response?.Data ?? new List<OblioProduct>();
    }

    public async Task<OblioDocumentResponse> CreateInvoiceAsync(string cif, OblioInvoiceRequest invoiceRequest)
    {
        var token = await GetAccessTokenAsync();
        var response = await PostAsync<OblioDocumentResponse>($"/docs/invoice?cif={cif}", invoiceRequest, token);
        return response ?? throw new Exception("Nu s-a putut emite factura");
    }

    public async Task<OblioDocumentResponse> CreateProformaAsync(string cif, OblioProformaRequest proformaRequest)
    {
        var token = await GetAccessTokenAsync();
        var response = await PostAsync<OblioDocumentResponse>($"/docs/proforma?cif={cif}", proformaRequest, token);
        return response ?? throw new Exception("Nu s-a putut emite proforma");
    }

    public async Task<byte[]> GetDocumentAsync(string cif, string seriesName, int number, string type = "pdf")
    {
        var token = await GetAccessTokenAsync();
        var url = $"/docs/{type}?cif={cif}&seriesName={seriesName}&number={number}";

        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync();
    }

    public async Task<bool> CancelDocumentAsync(string cif, string seriesName, int number, string type = "invoice")
    {
        var token = await GetAccessTokenAsync();
        var url = $"/docs/{type}/cancel?cif={cif}&seriesName={seriesName}&number={number}";
        var response = await PutAsync<OblioResponse<object>>(url, null, token);
        return response != null;
    }

    public async Task<bool> RestoreDocumentAsync(string cif, string seriesName, int number, string type = "invoice")
    {
        var token = await GetAccessTokenAsync();
        var url = $"/docs/{type}/restore?cif={cif}&seriesName={seriesName}&number={number}";
        var response = await PostAsync<OblioResponse<object>>(url, null, token);
        return response != null;
    }

    public async Task<bool> DeleteDocumentAsync(string cif, string seriesName, int number, string type = "invoice")
    {
        var token = await GetAccessTokenAsync();
        var url = $"/docs/{type}/delete?cif={cif}&seriesName={seriesName}&number={number}";
        var response = await DeleteAsync<OblioResponse<object>>(url, token);
        return response != null;
    }

    // Helper methods
    private async Task<T?> GetAsync<T>(string endpoint, string token)
    {
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.GetAsync(endpoint);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    private async Task<T?> PostAsync<T>(string endpoint, object? data, string token)
    {
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        HttpContent? content = null;
        if (data != null)
        {
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        var response = await _httpClient.PostAsync(endpoint, content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(responseContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    private async Task<T?> PutAsync<T>(string endpoint, object? data, string token)
    {
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        HttpContent? content = null;
        if (data != null)
        {
            var json = JsonSerializer.Serialize(data, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        var response = await _httpClient.PutAsync(endpoint, content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(responseContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    private async Task<T?> DeleteAsync<T>(string endpoint, string token)
    {
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _httpClient.DeleteAsync(endpoint);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }
}
