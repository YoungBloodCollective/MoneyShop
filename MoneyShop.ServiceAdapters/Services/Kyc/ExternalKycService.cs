using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.ServiceInterface.Interfaces.Kyc;

namespace MoneyShop.ServiceAdapters.Services.Kyc;

/// <summary>
/// HTTP proxy client for the external SRV.KYC microservice.
/// All requests include the X-API-Key header for authentication.
/// </summary>
public class ExternalKycService : IExternalKycService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ExternalKycService> _logger;
    private readonly string _apiKey;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ExternalKycService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ExternalKycService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;

        var baseUrl = _configuration["ExternalKyc:BaseUrl"] ?? "http://localhost:5242";
        _apiKey = _configuration["ExternalKyc:ApiKey"] ?? "";

        _httpClient.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-API-Key", _apiKey);
        }
    }

    public async Task<KycSessionCreated> CreateSessionAsync()
    {
        _logger.LogInformation("[ExternalKyc] Creating new KYC session");
        var response = await _httpClient.PostAsync("api/kyc/sessions", null);
        return await ReadResponse<KycSessionCreated>(response, "CreateSession");
    }

    public async Task<OcrResult> SubmitDocumentOcrAsync(
        string sessionId, string token, byte[] frontImage, byte[]? backImage = null)
    {
        _logger.LogInformation("[ExternalKyc] Submitting document OCR for session {SessionId}", sessionId);

        using var form = new MultipartFormDataContent();
        var frontContent = new ByteArrayContent(frontImage);
        frontContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
        form.Add(frontContent, "DocumentFront", "document_front.jpg");

        if (backImage != null)
        {
            var backContent = new ByteArrayContent(backImage);
            backContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
            form.Add(backContent, "DocumentBack", "document_back.jpg");
        }

        var response = await _httpClient.PostAsync(
            $"api/kyc/ocr/sessions/{sessionId}/verify?token={token}", form);
        return await ReadResponse<OcrResult>(response, "SubmitDocumentOcr");
    }

    public async Task<LivenessResult> SubmitLivenessAsync(
        string sessionId, string token, byte[] selfie)
    {
        _logger.LogInformation("[ExternalKyc] Submitting liveness for session {SessionId}", sessionId);

        using var form = new MultipartFormDataContent();
        var selfieContent = new ByteArrayContent(selfie);
        selfieContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
        form.Add(selfieContent, "Selfie", "selfie.jpg");

        var response = await _httpClient.PostAsync(
            $"api/kyc/liveness/sessions/{sessionId}/verify?token={token}", form);
        return await ReadResponse<LivenessResult>(response, "SubmitLiveness");
    }

    public async Task<ActiveLivenessResult> SubmitActiveLivenessAsync(
        string sessionId, string token, byte[] selfie, string? challengesJson = null)
    {
        _logger.LogInformation("[ExternalKyc] Submitting active liveness for session {SessionId}", sessionId);

        using var form = new MultipartFormDataContent();
        var selfieContent = new ByteArrayContent(selfie);
        selfieContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
        form.Add(selfieContent, "Selfie", "selfie.jpg");

        if (!string.IsNullOrEmpty(challengesJson))
        {
            form.Add(new StringContent(challengesJson), "ChallengesJson");
        }

        var response = await _httpClient.PostAsync(
            $"api/kyc/active-liveness/sessions/{sessionId}/verify?token={token}", form);
        return await ReadResponse<ActiveLivenessResult>(response, "SubmitActiveLiveness");
    }

    public async Task<FaceCompareResult> SubmitFaceCompareAsync(
        string sessionId, string token, byte[] documentPhoto, byte[] selfie)
    {
        _logger.LogInformation("[ExternalKyc] Submitting face compare for session {SessionId}", sessionId);

        using var form = new MultipartFormDataContent();

        var docContent = new ByteArrayContent(documentPhoto);
        docContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
        form.Add(docContent, "DocumentPhoto", "document_photo.jpg");

        var selfieContent = new ByteArrayContent(selfie);
        selfieContent.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
        form.Add(selfieContent, "Selfie", "selfie.jpg");

        var response = await _httpClient.PostAsync(
            $"api/kyc/compare/sessions/{sessionId}/verify?token={token}", form);
        return await ReadResponse<FaceCompareResult>(response, "SubmitFaceCompare");
    }

    public async Task<KycSessionStatus> GetSessionStatusAsync(string sessionId)
    {
        var response = await _httpClient.GetAsync($"api/kyc/sessions/{sessionId}");
        return await ReadResponse<KycSessionStatus>(response, "GetSessionStatus");
    }

    public async Task<KycVerificationDecision> GetDecisionAsync(string sessionId)
    {
        var response = await _httpClient.GetAsync($"api/kyc/sessions/{sessionId}/decision");
        return await ReadResponse<KycVerificationDecision>(response, "GetDecision");
    }

    private async Task<T> ReadResponse<T>(HttpResponseMessage response, string operation)
    {
        var content = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("[ExternalKyc] {Operation} failed: {Status} - {Content}",
                operation, response.StatusCode, content);
            throw new HttpRequestException(
                $"KYC service error ({response.StatusCode}): {content}");
        }

        var result = JsonSerializer.Deserialize<T>(content, JsonOptions);
        if (result == null)
        {
            throw new InvalidOperationException($"Empty response from KYC service for {operation}");
        }

        return result;
    }
}
