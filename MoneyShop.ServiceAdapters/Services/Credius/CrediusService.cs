using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.ServiceInterface.Interfaces.Credius;

namespace MoneyShop.ServiceAdapters.Services.Credius
{
    /// <summary>
    /// Thin forwarder to the Credius partner API. Reads its base URL, key and endpoint from
    /// config so the key never sits in source (the lesson from the removed Go2Credit controller).
    /// When nothing is configured it refuses to call out and returns Configured=false, so the
    /// endpoint is safe to deploy before Credius hands us the real credentials.
    /// </summary>
    public class CrediusService : ICrediusService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CrediusService> _logger;

        public CrediusService(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<CrediusService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
        }

        private string? BaseUrl => _configuration["Credius:BaseUrl"];
        private string? ApiKey => _configuration["Credius:ApiKey"];
        private string LeadEndpoint => _configuration["Credius:LeadEndpoint"] ?? "leads";

        public bool IsConfigured => !string.IsNullOrWhiteSpace(BaseUrl) && !string.IsNullOrWhiteSpace(ApiKey);

        public async Task<CrediusForwardResult> ForwardLeadAsync(CrediusLeadInput input)
        {
            if (!IsConfigured)
            {
                return new CrediusForwardResult
                {
                    Configured = false,
                    Success = false,
                    Message = "Integrarea Credius nu este configurată (setează Credius:BaseUrl și Credius:ApiKey în app settings)."
                };
            }

            var payload = new Dictionary<string, object?>
            {
                ["nume"] = input.Nume,
                ["prenume"] = input.Prenume,
                ["telefon"] = input.Telefon,
                ["email"] = input.Email,
                ["suma_solicitata"] = input.SumaSolicitata,
                ["tip_credit"] = input.TipCredit,
                ["partner_reference"] = input.PartnerReference
            };
            var filtered = payload.Where(kv => kv.Value != null).ToDictionary(kv => kv.Key, kv => kv.Value);
            var json = new StringContent(JsonSerializer.Serialize(filtered), Encoding.UTF8, "application/json");

            var url = $"{BaseUrl!.TrimEnd('/')}/{LeadEndpoint.TrimStart('/')}";

            try
            {
                var client = _httpClientFactory.CreateClient("Credius");
                client.Timeout = TimeSpan.FromSeconds(30);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);

                var resp = await client.PostAsync(url, json);
                var body = await resp.Content.ReadAsStringAsync();

                return new CrediusForwardResult
                {
                    Configured = true,
                    Success = resp.IsSuccessStatusCode,
                    StatusCode = (int)resp.StatusCode,
                    Message = resp.IsSuccessStatusCode ? "Lead trimis către Credius." : $"Credius a răspuns {(int)resp.StatusCode}.",
                    RawResponse = body?.Length > 2000 ? body.Substring(0, 2000) + "… [trunchiat]" : body
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Credius forward failed for {Reference}", input.PartnerReference);
                return new CrediusForwardResult
                {
                    Configured = true,
                    Success = false,
                    StatusCode = 502,
                    Message = $"Nu am putut contacta Credius: {ex.Message}"
                };
            }
        }
    }
}
