using System.Globalization;
using Microsoft.Extensions.Logging;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using MoneyShop.ServiceInterface.Interfaces.Kyc;

namespace MoneyShop.ServiceAdapters.Services.Acord;

public class AcordIdScanService : IAcordIdScanService
{
    public const int MaxImageBytes = 10 * 1024 * 1024;

    private static readonly string[] DateFormats =
        { "dd.MM.yyyy", "dd/MM/yyyy", "dd-MM-yyyy", "yyyy-MM-dd", "yyyy/MM/dd", "ddMMyyyy" };

    private static readonly string[] HeifBrands = { "heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1" };

    private readonly IExternalKycService _externalKyc;
    private readonly ILogger<AcordIdScanService> _logger;

    public AcordIdScanService(IExternalKycService externalKyc, ILogger<AcordIdScanService> logger)
    {
        _externalKyc = externalKyc;
        _logger = logger;
    }

    public async Task<AcordIdScanResult> ScanAsync(byte[] front, byte[]? back)
    {
        EnsureImage(front, "Poza cu fața actului");
        if (back is { Length: > 0 }) EnsureImage(back, "Poza cu versoul actului");
        else back = null;

        OcrData? data;
        LogicValidation? validation;
        try
        {
            var session = await _externalKyc.CreateSessionAsync();
            var ocr = await _externalKyc.SubmitDocumentOcrAsync(session.SessionId, session.Token, front, back);
            data = ocr.OcrData;
            validation = ocr.LogicValidation;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Id scan: the OCR provider failed");
            return Unreadable();
        }

        if (data == null || (string.IsNullOrWhiteSpace(data.LastName) && string.IsNullOrWhiteSpace(data.FirstName) && string.IsNullOrWhiteSpace(data.Cnp)))
            return Unreadable();

        var result = new AcordIdScanResult
        {
            Readable = true,
            IsNewFormat = data.IsNewFormat,
            HasAddress = !string.IsNullOrWhiteSpace(data.Address),
            LastName = Clean(data.LastName),
            FirstName = Clean(data.FirstName),
            CnpMasked = Mask(data.Cnp),
            ExpiryDate = Clean(data.ExpiryDate),
        };

        result.Expired = IsExpired(data.ExpiryDate, validation);
        if (result.Expired) result.Problems.Add("Actul a expirat.");
        if (!string.IsNullOrWhiteSpace(data.Cnp) && validation is { CnpChecksumValid: false })
            result.Problems.Add("Nu am putut verifica CNP-ul citit. Dacă nu se potrivește, refă poza.");

        if (!data.IsNewFormat)
        {
            result.TipAct = "carte_identitate";
        }
        else if (back == null)
        {
            result.NeedsBack = true;
        }
        else if (result.HasAddress)
        {
            result.NeedsBack = true;
            result.TipAct = "carte_identitate_simpla";
        }
        else
        {
            result.NeedsBack = true;
            result.NeedsProofOfAddress = true;
            result.TipAct = "carte_identitate_electronica";
        }

        return result;
    }

    private static AcordIdScanResult Unreadable() => new()
    {
        Readable = false,
        Problems = { "Nu am putut citi actul, încearcă o poză mai clară." }
    };

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? Mask(string? cnp)
    {
        var digits = new string((cnp ?? string.Empty).Where(char.IsDigit).ToArray());
        return digits.Length == 13 ? "******" + digits[^4..] : null;
    }

    private static bool IsExpired(string? expiry, LogicValidation? validation)
    {
        if (DateTime.TryParseExact((expiry ?? string.Empty).Trim(), DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            return date.Date < DateTime.UtcNow.Date;

        return validation is { DocumentNotExpired: false };
    }

    private static void EnsureImage(byte[] bytes, string label)
    {
        if (bytes.Length == 0) throw new ArgumentException($"{label} este obligatorie.");
        if (bytes.Length > MaxImageBytes) throw new ArgumentException($"{label}: fișierul depășește 10MB.");
        if (!LooksLikeImage(bytes)) throw new ArgumentException($"{label}: acceptăm doar imagini JPG, PNG, WebP sau HEIC.");
    }

    internal static bool LooksLikeImage(byte[] b)
    {
        if (b.Length < 12) return false;
        if (b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return true;
        if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return true;
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return true;
        if (b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p')
            return HeifBrands.Contains(System.Text.Encoding.ASCII.GetString(b, 8, 4));
        return false;
    }
}
