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
using MoneyShop.ServiceInterface.Interfaces.Chat;
using MoneyShop.ServiceInterface.Dtos.Chat;

namespace MoneyShop.ServiceAdapters.Services.Chat;

public class OpenAIChatService : IChatService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenAIChatService> _logger;
    private readonly string _apiKey;
    private readonly string _endpoint;
    private readonly string _deploymentName;
    private readonly string _apiVersion;
    private readonly int _maxOutputTokens;

    private const string SystemPromptBase = @"Esti Asistentul Virtual MoneyShop pentru POPIX BROKERAGE CONSULTING S.R.L. (broker de credite / intermediar, NU institutie de credit).
Rolul tau este sa explici pe intelesul tuturor concepte de creditare, eligibilitate, documente, pasi de urmat si sa ajuti utilizatorii sa inteleaga rezultatele calculatoarelor MoneyShop.

REGULI OBLIGATORII (nu ai voie sa le incalci):
1) NU ai voie niciodata sa mentionezi, sa listezi, sa compari sau sa recomanzi nume de banci, IFN-uri sau branduri financiare.
   - Daca utilizatorul intreaba ""Ce banca imi recomanzi?"", refuza politicos si ofera doar criterii generale.
   - Foloseste doar termeni neutri: ""o banca"", ""un creditor"", ""o institutie financiara"", ""un furnizor de credit"".
2) NU promite aprobari si NU garanta dobanzi. Vorbeste doar estimativ si conditionat.
3) NU solicita si NU afisa date sensibile: CNP, serie/numar CI, numar complet card, parole, OTP.
   - Daca ai nevoie de informatii, cere doar date nesensibile: venit net aproximativ, tip contract, vechime, obligatii lunare totale.
4) Daca utilizatorul insista sa afle banca potrivita, raspunde astfel:
   - Explica criterii generale si recomanda programarea unei discutii cu un broker autorizat (uman).
5) Raspunsurile trebuie sa fie in romana fara diacritice, clare, scurte, structurate (liste/bullets).
6) Daca nu esti sigur, spune ce informatie minima lipseste si pune 1-2 intrebari scurte.

Conformitate:
- Ofera informatii educationale si ghidaj de proces, nu consultanta financiara/juridica personalizata.
- Include la final o nota scurta: ""Rezultatele sunt estimative; aprobarea finala apartine creditorului.""";

    public OpenAIChatService(
        IConfiguration configuration,
        ILogger<OpenAIChatService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        // Use Azure OpenAI configuration (same keys as AzureOpenAIPluginService)
        _endpoint = _configuration["AzureOpenAI:Endpoint"] ?? "";
        _apiKey = _configuration["AzureOpenAI:ApiKey"] ?? "";
        _deploymentName = _configuration["AzureOpenAI:DeploymentName"] ?? "gpt-4o-mini";
        _apiVersion = _configuration["AzureOpenAI:ApiVersion"] ?? "2024-02-15-preview";

        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
            throw new InvalidOperationException("AzureOpenAI:Endpoint si AzureOpenAI:ApiKey trebuie configurate in appsettings.json");

        if (_endpoint.EndsWith("/"))
            _endpoint = _endpoint.TrimEnd('/');

        _httpClient = new HttpClient();
        _httpClient.BaseAddress = new Uri(_endpoint);
        _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "MoneyShop/1.0");

        _maxOutputTokens = int.Parse(_configuration["OpenAI:MaxOutputTokens"] ?? "350");
    }

    public async Task<ChatResponse> ChatAsync(ChatRequest request, IFaqCacheService? faqCacheService = null)
    {
        try
        {
            // Check for bank name requests
            if (BankNameFilter.AsksForBankNames(request.Message))
            {
                return new ChatResponse
                {
                    Raspuns = BankNameFilter.GetBankRefusalMessage(),
                    ModelFolosit = "policy_bank_refusal",
                    Upgraded = false,
                    Siguranta = new Dictionary<string, object> { { "blocked", true }, { "motiv", "BANK_NAMES_REQUEST" } },
                    Nota = "Rezultatele sunt estimative; aprobarea finala apartine creditorului."
                };
            }

            // Check topic guard
            var guard = TopicGuard.CheckTopic(request.Message);
            if (!guard.Allowed)
            {
                return new ChatResponse
                {
                    Raspuns = TopicGuard.GetRefusalMessage(guard.Reason),
                    ModelFolosit = "policy_refusal",
                    Upgraded = false,
                    Siguranta = new Dictionary<string, object> { { "blocked", true }, { "motiv", guard.Reason.ToString() } },
                    Nota = "Rezultatele sunt estimative; aprobarea finala apartine creditorului."
                };
            }

            // FAQ Cache check
            if (faqCacheService != null)
            {
                var faqMatch = await faqCacheService.MatchFaqAsync(request.Message);
                if (faqMatch.Hit && faqMatch.Item != null)
                {
                    return new ChatResponse
                    {
                        Raspuns = faqMatch.Item.Answer,
                        ModelFolosit = "faq_cache",
                        Upgraded = false,
                        Siguranta = new Dictionary<string, object>
                        {
                            { "cached", true },
                            { "faq_id", faqMatch.Item.Id },
                            { "score", faqMatch.Score ?? 0 }
                        },
                        Nota = "Rezultatele sunt estimative; aprobarea finala apartine creditorului."
                    };
                }
            }

            // Build user message with context
            var userMessage = request.Message;
            if (request.Context != null && request.Context.Any())
            {
                userMessage += $"\n\n[Context MoneyShop JSON]\n{System.Text.Json.JsonSerializer.Serialize(request.Context)}";
            }

            // Try primary model
            var primaryResponse = await TryPrimaryModelAsync(userMessage);

            if (primaryResponse != null && !primaryResponse.Upgraded)
            {
                return primaryResponse;
            }

            // Fallback to better model
            return await TryFallbackModelAsync(userMessage);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Eroare la chat OpenAI");
            throw;
        }
    }

    private async Task<ChatResponse?> TryPrimaryModelAsync(string userMessage)
    {
        try
        {
            const string instructJson = @"
Returneaza DOAR JSON valid, fara alte texte, in format:
{
  ""raspuns"": ""string"",
  ""necesita_upgrade"": boolean,
  ""incredere"": number,
  ""motiv"": ""string""
}
Reguli:
- ""necesita_upgrade"" = true daca intrebarea e complexa/ambigua sau nu esti sigur.
- ""incredere"" intre 0 si 1. Daca < 0.65, pune necesita_upgrade=true.
- Nu mentiona nume de banci/IFN/branduri.
- Raspunsul in romana fara diacritice.";

            var requestBody = new
            {
                messages = new[]
                {
                    new { role = "system", content = SystemPromptBase },
                    new { role = "system", content = instructJson },
                    new { role = "user", content = userMessage }
                },
                max_tokens = _maxOutputTokens,
                temperature = 0.7
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var url = $"/openai/deployments/{_deploymentName}/chat/completions?api-version={_apiVersion}";
            var response = await _httpClient.PostAsync(url, content);
            response.EnsureSuccessStatusCode();

            var responseJson = await response.Content.ReadAsStringAsync();
            var responseObj = JsonSerializer.Deserialize<JsonElement>(responseJson);

            var responseText = responseObj.GetProperty("choices")[0]
                .GetProperty("message").GetProperty("content").GetString()?.Trim() ?? "";

            // Try to parse JSON
            var jsonResponse = TryParseJsonResponse(responseText);

            if (jsonResponse == null)
            {
                _logger.LogWarning("Primary model nu a returnat JSON valid, folosim fallback");
                return null;
            }

            var raspuns = jsonResponse.Value.Raspuns ?? responseText;
            var cleaned = BankNameFilter.ScrubBankNames(raspuns);

            var incredere = jsonResponse.Value.Incredere ?? 0.5;
            var necesita = jsonResponse.Value.NecesitaUpgrade || incredere < 0.65 || cleaned.Flagged;

            if (!necesita)
            {
                return new ChatResponse
                {
                    Raspuns = cleaned.Text,
                    ModelFolosit = $"azure-{_deploymentName}",
                    Upgraded = false,
                    Incredere = incredere,
                    Siguranta = new Dictionary<string, object> { { "bank_name_scrubbed", cleaned.Flagged } },
                    Nota = "Rezultatele sunt estimative; aprobarea finala apartine creditorului."
                };
            }

            // Needs upgrade
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Eroare la primary model, folosim fallback");
            return null;
        }
    }

    private async Task<ChatResponse> TryFallbackModelAsync(string userMessage)
    {
        // Azure OpenAI fallback — same deployment, but without JSON constraint
        // (the primary attempt asked for structured JSON; fallback gets free-form text)
        var requestBody = new
        {
            messages = new[]
            {
                new { role = "system", content = SystemPromptBase },
                new { role = "user", content = userMessage }
            },
            max_tokens = _maxOutputTokens,
            temperature = 0.7
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var url = $"/openai/deployments/{_deploymentName}/chat/completions?api-version={_apiVersion}";
        var response = await _httpClient.PostAsync(url, content);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync();
        var responseObj = JsonSerializer.Deserialize<JsonElement>(responseJson);

        var responseText = responseObj.GetProperty("choices")[0]
            .GetProperty("message").GetProperty("content").GetString()?.Trim() ?? "";
        var cleaned = BankNameFilter.ScrubBankNames(responseText);

        return new ChatResponse
        {
            Raspuns = cleaned.Text,
            ModelFolosit = $"azure-{_deploymentName}-fallback",
            Upgraded = true,
            Siguranta = new Dictionary<string, object> { { "bank_name_scrubbed", cleaned.Flagged } },
            Nota = "Rezultatele sunt estimative; aprobarea finala apartine creditorului."
        };
    }

    private (string? Raspuns, bool NecesitaUpgrade, double? Incredere, string? Motiv)? TryParseJsonResponse(string text)
    {
        try
        {
            var jsonStart = text.IndexOf('{');
            var jsonEnd = text.LastIndexOf('}');

            if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart)
                return null;

            var jsonText = text.Substring(jsonStart, jsonEnd - jsonStart + 1);
            var json = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(jsonText);

            if (json == null)
                return null;

            return (
                json.ContainsKey("raspuns") ? json["raspuns"]?.ToString() : null,
                json.ContainsKey("necesita_upgrade") && bool.TryParse(json["necesita_upgrade"]?.ToString(), out var necesita) && necesita,
                json.ContainsKey("incredere") && double.TryParse(json["incredere"]?.ToString(), out var incredere) ? incredere : null,
                json.ContainsKey("motiv") ? json["motiv"]?.ToString() : null
            );
        }
        catch
        {
            return null;
        }
    }
}
