using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.ServiceInterface.Interfaces.OpenAIPlugin;

namespace MoneyShop.ServiceAdapters.Services.OpenAIPlugin;

/// <summary>
/// Service for Azure OpenAI Plugin functionality
/// </summary>
public class AzureOpenAIPluginService : IAzureOpenAIPluginService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AzureOpenAIPluginService> _logger;

    private readonly string _apiKey;
    private readonly string _endpoint;
    private readonly string _deploymentName;
    private readonly string _apiVersion;

    public AzureOpenAIPluginService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<AzureOpenAIPluginService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        _endpoint = _configuration["AzureOpenAI:Endpoint"] ?? "";
        _apiKey = _configuration["AzureOpenAI:ApiKey"] ?? "";
        _deploymentName = _configuration["AzureOpenAI:DeploymentName"] ?? "gpt-4o-mini";
        _apiVersion = _configuration["AzureOpenAI:ApiVersion"] ?? "2024-02-15-preview";

        if (!string.IsNullOrEmpty(_endpoint) && _endpoint.EndsWith("/"))
        {
            _endpoint = _endpoint.TrimEnd('/');
        }

        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
        {
            _logger.LogWarning("Azure OpenAI configuration is missing. Plugin functionality will not work.");
        }
        else
        {
            _httpClient.BaseAddress = new Uri(_endpoint);
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);
        }
    }

    public PluginInfo GetPluginInfo()
    {
        return new PluginInfo
        {
            Name = "MoneyShop Text Summarizer Plugin",
            Description = "Summarizes the text received through the prompt using Azure OpenAI",
            Version = "1.0.0"
        };
    }

    public async Task<PluginResponse> ProcessPromptAsync(string prompt)
    {
        if (string.IsNullOrWhiteSpace(prompt))
        {
            throw new ArgumentException("Prompt cannot be empty or null", nameof(prompt));
        }

        if (string.IsNullOrEmpty(_endpoint) || string.IsNullOrEmpty(_apiKey))
        {
            throw new InvalidOperationException("Azure OpenAI is not configured. Please set AzureOpenAI:Endpoint and AzureOpenAI:ApiKey in appsettings.json");
        }

        try
        {
            var requestBody = new
            {
                messages = new[]
                {
                    new
                    {
                        role = "system",
                        content = "You are a helpful assistant that summarizes text clearly and concisely."
                    },
                    new
                    {
                        role = "user",
                        content = prompt
                    }
                },
                max_tokens = 500,
                temperature = 0.7
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var url = $"/openai/deployments/{_deploymentName}/chat/completions?api-version={_apiVersion}";
            var fullUrl = $"{_endpoint}{url}";

            _logger.LogInformation("Calling Azure OpenAI. Full URL: {FullUrl}, Deployment: {Deployment}, API Version: {ApiVersion}",
                fullUrl, _deploymentName, _apiVersion);

            var response = await _httpClient.PostAsync(url, content);
            var responseContent = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("Azure OpenAI response status: {Status}", response.StatusCode);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Azure OpenAI request failed. Status: {Status}, Response: {Response}",
                    response.StatusCode, responseContent);

                throw new HttpRequestException(
                    $"Azure OpenAI request failed with status {response.StatusCode}: {responseContent}");
            }

            var jsonResponse = JsonDocument.Parse(responseContent);
            var choices = jsonResponse.RootElement.GetProperty("choices");

            if (choices.GetArrayLength() == 0)
            {
                throw new InvalidOperationException("Azure OpenAI returned no choices in the response");
            }

            var firstChoice = choices[0];
            var message = firstChoice.GetProperty("message");
            var contentText = message.GetProperty("content").GetString();

            return new PluginResponse
            {
                Result = contentText ?? "",
                Model = _deploymentName,
                Success = true
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error when calling Azure OpenAI");
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Error parsing Azure OpenAI response");
            throw new InvalidOperationException("Failed to parse Azure OpenAI response", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error when calling Azure OpenAI");
            throw;
        }
    }
}
