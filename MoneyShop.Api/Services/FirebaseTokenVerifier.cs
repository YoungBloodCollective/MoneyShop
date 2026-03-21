using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography.X509Certificates;
using Microsoft.IdentityModel.Tokens;

namespace MoneyShop.Api.Services;

public class FirebaseTokenVerifier
{
    private const string GoogleCertsUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
    private readonly string _projectId;
    private readonly HttpClient _httpClient;
    private Dictionary<string, SecurityKey>? _cachedKeys;
    private DateTime _cacheExpiry = DateTime.MinValue;

    public FirebaseTokenVerifier(string projectId, HttpClient httpClient)
    {
        _projectId = projectId;
        _httpClient = httpClient;
    }

    public async Task<FirebaseUserInfo> VerifyIdTokenAsync(string idToken)
    {
        var keys = await GetSigningKeysAsync();
        var handler = new JwtSecurityTokenHandler
        {
            MapInboundClaims = false
        };
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/{_projectId}",
            ValidateAudience = true,
            ValidAudience = _projectId,
            ValidateLifetime = true,
            IssuerSigningKeyResolver = (token, securityToken, kid, validationParameters) =>
            {
                if (keys.TryGetValue(kid, out var key))
                    return new[] { key };
                return Enumerable.Empty<SecurityKey>();
            }
        };
        var principal = handler.ValidateToken(idToken, parameters, out var validatedToken);
        var jwtToken = (JwtSecurityToken)validatedToken;
        var uid = jwtToken.Payload.TryGetValue("user_id", out var uidVal) ? uidVal?.ToString() : null;
        uid ??= jwtToken.Subject;
        if (string.IsNullOrEmpty(uid))
            throw new SecurityTokenException("Token missing user_id claim");
        var email = jwtToken.Payload.TryGetValue("email", out var emailVal) ? emailVal?.ToString() : null;
        var name = jwtToken.Payload.TryGetValue("name", out var nameVal) ? nameVal?.ToString() : null;
        return new FirebaseUserInfo { Uid = uid, Email = email, Name = name };
    }

    private async Task<Dictionary<string, SecurityKey>> GetSigningKeysAsync()
    {
        if (_cachedKeys != null && DateTime.UtcNow < _cacheExpiry)
            return _cachedKeys;
        var response = await _httpClient.GetAsync(GoogleCertsUrl);
        response.EnsureSuccessStatusCode();
        if (response.Headers.CacheControl?.MaxAge is { } maxAge)
            _cacheExpiry = DateTime.UtcNow.Add(maxAge);
        else
            _cacheExpiry = DateTime.UtcNow.AddHours(1);
        var certsJson = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        _cachedKeys = new Dictionary<string, SecurityKey>();
        foreach (var (kid, certPem) in certsJson!)
        {
            var certBytes = Convert.FromBase64String(
                certPem
                    .Replace("-----BEGIN CERTIFICATE-----", "")
                    .Replace("-----END CERTIFICATE-----", "")
                    .Replace("\n", "")
            );
            var cert = new X509Certificate2(certBytes);
            _cachedKeys[kid] = new X509SecurityKey(cert);
        }
        return _cachedKeys;
    }
}

public class FirebaseUserInfo
{
    public string Uid { get; set; } = null!;
    public string? Email { get; set; }
    public string? Name { get; set; }
}
