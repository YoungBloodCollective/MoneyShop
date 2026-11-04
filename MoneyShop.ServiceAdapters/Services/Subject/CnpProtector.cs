using System;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.ServiceInterface.Interfaces.Subject;

namespace MoneyShop.ServiceAdapters.Services.Subject;

/// <summary>
/// AES-256-GCM over the CNP. The stored payload is [version][nonce][ciphertext][tag]:
/// the tag makes a tampered row fail to decrypt rather than return something plausible,
/// and the version byte leaves room to re-key without guessing at old rows.
/// </summary>
/// <remarks>
/// The key is read from configuration and nothing else. There is deliberately no built-in
/// fallback: a missing key means the CNP is not stored, never that it is stored under a
/// key that is public knowledge. Supply it as 32 random bytes, base64-encoded, through
/// user-secrets in development and an environment variable or Key Vault reference in
/// production - never in a committed appsettings file.
/// </remarks>
public class CnpProtector : ICnpProtector
{
    public const string KEY_SETTING = "Subject:EncryptionKey";

    private const byte VERSION_AES_GCM = 0x01;
    private const int KEY_BYTES = 32;
    private const int NONCE_BYTES = 12;
    private const int TAG_BYTES = 16;
    private const int HEADER_BYTES = 1 + NONCE_BYTES;

    private readonly byte[]? _key;
    private readonly ILogger<CnpProtector> _logger;

    public CnpProtector(IConfiguration configuration, ILogger<CnpProtector> logger)
    {
        _logger = logger;
        _key = ReadKey(configuration[KEY_SETTING], logger);
    }

    public bool IsConfigured => _key != null;

    public byte[] Protect(string cnp)
    {
        if (string.IsNullOrWhiteSpace(cnp))
            throw new ArgumentException("CNP cannot be empty", nameof(cnp));

        if (_key == null)
            throw new InvalidOperationException(
                $"No CNP encryption key is configured. Set '{KEY_SETTING}' to 32 random bytes, base64-encoded.");

        var plaintext = Encoding.UTF8.GetBytes(cnp);
        var payload = new byte[HEADER_BYTES + plaintext.Length + TAG_BYTES];

        payload[0] = VERSION_AES_GCM;
        var nonce = payload.AsSpan(1, NONCE_BYTES);
        RandomNumberGenerator.Fill(nonce);

        using var aes = new AesGcm(_key, TAG_BYTES);
        aes.Encrypt(
            nonce,
            plaintext,
            payload.AsSpan(HEADER_BYTES, plaintext.Length),
            payload.AsSpan(HEADER_BYTES + plaintext.Length, TAG_BYTES));

        CryptographicOperations.ZeroMemory(plaintext);
        return payload;
    }

    public string? Unprotect(byte[]? payload)
    {
        if (_key == null || payload == null || payload.Length <= HEADER_BYTES + TAG_BYTES)
            return null;

        if (payload[0] != VERSION_AES_GCM)
        {
            _logger.LogWarning("Stored CNP carries unknown format version {Version}", payload[0]);
            return null;
        }

        var cipherLength = payload.Length - HEADER_BYTES - TAG_BYTES;
        var plaintext = new byte[cipherLength];

        try
        {
            using var aes = new AesGcm(_key, TAG_BYTES);
            aes.Decrypt(
                payload.AsSpan(1, NONCE_BYTES),
                payload.AsSpan(HEADER_BYTES, cipherLength),
                payload.AsSpan(HEADER_BYTES + cipherLength, TAG_BYTES),
                plaintext);

            return Encoding.UTF8.GetString(plaintext);
        }
        catch (CryptographicException)
        {
            // Wrong key or a tampered row. Which one it is would only be guesswork, and the
            // caller treats both the same way: there is no CNP to show.
            _logger.LogError("Stored CNP could not be decrypted; the key may have changed");
            return null;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    private static byte[]? ReadKey(string? configured, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(configured))
        {
            logger.LogWarning(
                "No CNP encryption key configured ('{Setting}'); the CNP will not be stored", KEY_SETTING);
            return null;
        }

        byte[] key;
        try
        {
            key = Convert.FromBase64String(configured.Trim());
        }
        catch (FormatException)
        {
            logger.LogError("'{Setting}' is not valid base64; the CNP will not be stored", KEY_SETTING);
            return null;
        }

        if (key.Length != KEY_BYTES)
        {
            logger.LogError(
                "'{Setting}' decodes to {Actual} bytes, expected {Expected}; the CNP will not be stored",
                KEY_SETTING, key.Length, KEY_BYTES);
            return null;
        }

        return key;
    }
}
