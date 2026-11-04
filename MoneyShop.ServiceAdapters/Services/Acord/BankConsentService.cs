using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Document;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using MoneyShop.ServiceInterface.Interfaces.Broker;
using MoneyShop.ServiceInterface.Interfaces.Document;
using MoneyShop.ServiceInterface.Interfaces.Subject;

namespace MoneyShop.ServiceAdapters.Services.Acord;

public class BankConsentService : IBankConsentService
{
    private const int LINK_VALIDITY_DAYS = 7;
    private const int ARCHIVE_YEARS = 5;
    private const int MAX_SIGNATURE_BYTES = 1024 * 1024;
    private const int MIN_ADDRESS_LENGTH = 10;
    private const int MAX_ADDRESS_LENGTH = 250;
    private const string STATUS_PENDING = "pending";
    private const string STATUS_SIGNING = "signing";
    private const string STATUS_SIGNED = "signed";
    private const string STATUS_REPLACED = "replaced";
    private const string STATUS_EXPIRED = "expired";
    private static readonly CultureInfo RomanianCulture = CultureInfo.GetCultureInfo("ro-RO");
    private static readonly byte[] PngMagic = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

    private static readonly string[] BirthDateFormats =
    {
        "dd.MM.yyyy", "dd/MM/yyyy", "dd-MM-yyyy", "yyyy-MM-dd", "yyyy/MM/dd", "ddMMyyyy"
    };

    private readonly MoneyShopDbContext _context;
    private readonly IPdfGenerationService _pdfGenerationService;
    private readonly IBrokerProfileService _brokerProfiles;
    private readonly ISubjectService _subjectService;
    private readonly ILogger<BankConsentService> _logger;

    public BankConsentService(
        MoneyShopDbContext context,
        IPdfGenerationService pdfGenerationService,
        IBrokerProfileService brokerProfiles,
        ISubjectService subjectService,
        ILogger<BankConsentService> logger)
    {
        _context = context;
        _pdfGenerationService = pdfGenerationService;
        _brokerProfiles = brokerProfiles;
        _subjectService = subjectService;
        _logger = logger;
    }

    public List<BankConsentBank> ListBanks() =>
        BankConsentCatalog.All
            .Select(b => new BankConsentBank { Code = b.Code, Name = b.Name, DocumentCount = b.Documents.Count })
            .ToList();

    public List<BankConsentInfo> ListForAcord(Guid acordId) =>
        _context.BankConsentRequests
            .Where(r => r.AcordId == acordId)
            .OrderByDescending(r => r.CreatedAt)
            .ToList()
            .Select(ToInfo)
            .ToList();

    public BankConsentCreateResult CreateForAcord(Guid acordId, string bankCode, int? createdByUserId)
    {
        var acord = _context.AcordClients.FirstOrDefault(a => a.AcordId == acordId);
        if (acord == null) return new BankConsentCreateResult { NotFound = true, Error = "Acordul nu a fost gasit" };
        if (acord.SignedAt == null || acord.KycId == null)
            return new BankConsentCreateResult { Error = "Clientul trebuie sa semneze intai acordul" };

        var bank = BankConsentCatalog.Find(bankCode);
        if (bank == null) return new BankConsentCreateResult { Error = "Banca selectata nu este disponibila" };

        var now = DateTime.UtcNow;
        foreach (var previous in _context.BankConsentRequests
                     .Where(r => r.AcordId == acordId && r.BankCode == bank.Code && r.Status == STATUS_PENDING))
            previous.Status = STATUS_REPLACED;

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var request = new BankConsentRequest
        {
            AcordId = acord.AcordId,
            BrokerProfileId = acord.BrokerProfileId,
            BankCode = bank.Code,
            TokenHash = HashToken(token),
            FullName = $"{acord.Prenume} {acord.Nume}".Trim().ToUpper(RomanianCulture),
            Telefon = acord.Telefon,
            Email = acord.Email,
            Status = STATUS_PENDING,
            CreatedByUserId = createdByUserId,
            CreatedAt = now,
            ExpiresAt = now.AddDays(LINK_VALIDITY_DAYS)
        };

        _context.BankConsentRequests.Add(request);
        _context.SaveChanges();

        var slug = acord.BrokerProfileId.HasValue
            ? _context.BrokerProfiles.Where(p => p.Id == acord.BrokerProfileId.Value).Select(p => p.Slug).FirstOrDefault()
            : null;

        _logger.LogInformation("Bank consent link {RequestId} ({Bank}) created for acord {AcordId}", request.Id, bank.Code, acord.AcordId);
        return new BankConsentCreateResult { Success = true, Token = token, BrokerSlug = slug, Request = ToInfo(request) };
    }

    public BankConsentPublicView? GetByToken(string token)
    {
        var request = FindByToken(token);
        if (request == null) return null;

        var bank = BankConsentCatalog.Find(request.BankCode);
        if (bank == null) return null;

        var status = EffectiveStatus(request);
        var view = new BankConsentPublicView { Status = status, BankName = bank.Name, SignedAt = request.SignedAt };
        if (status != STATUS_PENDING) return view;

        view.FullName = request.FullName;
        view.Telefon = request.Telefon;
        view.Email = request.Email;
        // A client whose CNP is already stored does not retype it; the form is filled from
        // storage when they sign. Only the ones from before that still have to.
        view.RequiresCnp = bank.Requires(BankConsentFields.Cnp) && !HasStoredCnp(request.AcordId);
        view.CnpHint = view.RequiresCnp ? LastFourOfMaskedCnp(request.AcordId) : null;
        view.RequiresAddress = bank.Requires(BankConsentFields.Address);
        view.Address = view.RequiresAddress ? StoredAddress(request.AcordId) : null;
        view.RequiresBirthDate = bank.Requires(BankConsentFields.BirthDate);
        view.BirthDate = view.RequiresBirthDate ? StoredBirthDate(request.AcordId) : null;
        view.Documents = bank.Documents
            .Where(d => !d.BrokerOnly)
            .Select(d => new BankConsentDocumentView { Code = d.Code, Title = d.Title, Summary = d.Summary })
            .ToList();

        return view;
    }

    public BankConsentDocumentFile? GetDocumentByToken(string token, string documentCode)
    {
        // The preview carries no signature and no CNP, so it stays safe to read whatever the
        // link's status is. Gating it on "pending" meant that a link which had just been
        // replaced by a new one (or signed, or had a sign interrupted) answered every document
        // with a raw 404, while the already-open page still listed the forms — a dead end for
        // the client. Viewing is always allowed; only signing still requires a pending link.
        var request = FindByToken(token);
        if (request == null) return null;

        var bank = BankConsentCatalog.Find(request.BankCode);
        var document = bank?.Find(documentCode);
        if (bank == null || document == null) return null;

        // The preview is the real form minus the signature and, for the forms that ask for
        // it, minus the CNP: the client types that only when they sign.
        var input = BuildInput(request, new BankConsentSignInput(), signaturePng: null, signedOn: DateTime.UtcNow);
        return new BankConsentDocumentFile
        {
            FileName = $"{bank.Code}-{document.Code}.pdf",
            Content = _pdfGenerationService.GenerateBankConsentPdf(bank.Code, document.Code, input)
        };
    }

    public BankConsentSignResult Sign(string token, byte[] signaturePng, BankConsentSignInput input, string? ip, string? userAgent)
    {
        var request = FindByToken(token);
        if (request == null) return new BankConsentSignResult { NotFound = true, Error = "Linkul nu este valid" };

        var bank = BankConsentCatalog.Find(request.BankCode);
        if (bank == null) return new BankConsentSignResult { NotFound = true, Error = "Linkul nu este valid" };

        var status = EffectiveStatus(request);
        if (status == STATUS_SIGNED) return new BankConsentSignResult { Error = "Documentele au fost deja semnate" };
        if (status != STATUS_PENDING) return new BankConsentSignResult { Error = "Linkul a expirat. Cere brokerului un link nou." };

        if (signaturePng.Length == 0 || signaturePng.Length > MAX_SIGNATURE_BYTES || !signaturePng.AsSpan().StartsWith(PngMagic))
            return new BankConsentSignResult { Error = "Semnatura nu este valida" };

        var supplied = new BankConsentSignInput
        {
            Address = input.Address?.Trim(),
            BirthDate = input.BirthDate?.Trim(),
        };

        if (bank.Requires(BankConsentFields.Cnp))
        {
            // The stored CNP is the one the client already proved with their ID document, so
            // it wins over anything typed into this form. Typing is only the path for the
            // subjects from before the CNP was kept.
            supplied.Cnp = StoredCnp(request, ip, userAgent);

            if (supplied.Cnp == null)
            {
                supplied.Cnp = CnpIdentity.Digits(input.Cnp);
                if (!CnpIdentity.IsValid(supplied.Cnp))
                    return new BankConsentSignResult { Error = "CNP-ul nu este valid. Verifica cele 13 cifre de pe actul de identitate." };

                var expectedLastFour = LastFourOfMaskedCnp(request.AcordId);
                if (expectedLastFour != null && !supplied.Cnp.EndsWith(expectedLastFour, StringComparison.Ordinal))
                    return new BankConsentSignResult { Error = "CNP-ul nu se potriveste cu actul incarcat la semnarea acordului." };
            }
        }

        if (bank.Requires(BankConsentFields.Address) &&
            (supplied.Address == null || supplied.Address.Length is < MIN_ADDRESS_LENGTH or > MAX_ADDRESS_LENGTH))
            return new BankConsentSignResult { Error = "Completeaza adresa de domiciliu asa cum apare pe actul de identitate." };

        if (bank.Requires(BankConsentFields.BirthDate))
        {
            supplied.BirthDate = NormaliseBirthDate(supplied.BirthDate);
            if (supplied.BirthDate == null)
                return new BankConsentSignResult { Error = "Completeaza data nasterii in formatul zz.ll.aaaa." };
        }

        var claimed = _context.BankConsentRequests
            .IgnoreQueryFilters()
            .Where(r => r.Id == request.Id && r.Status == STATUS_PENDING)
            .ExecuteUpdate(s => s.SetProperty(r => r.Status, STATUS_SIGNING));
        if (claimed == 0) return new BankConsentSignResult { Error = "Documentele au fost deja semnate" };

        try
        {
            var acord = _context.AcordClients.IgnoreQueryFilters().First(a => a.AcordId == request.AcordId);
            var signedAt = DateTime.UtcNow;
            var pdfInput = BuildInput(request, supplied, signaturePng, signedAt);

            Guid? firstFileId = null;
            foreach (var document in bank.Documents.Where(d => !d.BrokerOnly))
            {
                var pdf = _pdfGenerationService.GenerateBankConsentPdf(bank.Code, document.Code, pdfInput);
                var file = new KycFile
                {
                    FileId = Guid.NewGuid(),
                    KycId = acord.KycId!.Value,
                    FileType = BankConsentCatalog.FileType(bank.Code, document.Code),
                    FileName = $"{bank.Code}-{document.Code}-{acord.AcordId}.pdf",
                    MimeType = "application/pdf",
                    FileSize = pdf.LongLength,
                    Sha256Hash = SHA256.HashData(pdf),
                    FileContentBase64 = Convert.ToBase64String(pdf),
                    CreatedAt = signedAt,
                    ExpiresAt = signedAt.AddYears(ARCHIVE_YEARS)
                };
                _context.KycFiles.Add(file);
                firstFileId ??= file.FileId;
            }

            request.Status = STATUS_SIGNED;
            request.SignedAt = signedAt;
            request.SignedIp = Truncate(ip, 64);
            request.SignedUserAgent = Truncate(userAgent, 500);
            request.FileId = firstFileId;
            _context.SaveChanges();

            _logger.LogInformation("Bank consent {RequestId} ({Bank}, {Count} forms) signed for acord {AcordId}",
                request.Id, bank.Code, bank.Documents.Count, acord.AcordId);
            return new BankConsentSignResult { Success = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not sign bank consent {RequestId}", request.Id);
            _context.ChangeTracker.Clear();
            _context.BankConsentRequests
                .IgnoreQueryFilters()
                .Where(r => r.Id == request.Id && r.Status == STATUS_SIGNING)
                .ExecuteUpdate(s => s.SetProperty(r => r.Status, STATUS_PENDING));
            return new BankConsentSignResult { Error = "Nu am putut salva semnatura. Incearca din nou." };
        }
    }

    /// <summary>
    /// Everything the forms can carry. The address comes from the ID card the client
    /// uploaded with the acord. The CNP is resolved before this call - out of storage when
    /// the subject has one, otherwise from what the client typed - so the preview, which
    /// passes an empty input, still carries no CNP.
    /// </summary>
    private BankConsentPdfInput BuildInput(BankConsentRequest request, BankConsentSignInput supplied, byte[]? signaturePng, DateTime signedOn)
    {
        var acord = _context.AcordClients.IgnoreQueryFilters().FirstOrDefault(a => a.AcordId == request.AcordId);
        var kycSession = acord?.KycId == null
            ? null
            : _context.KycSessions.FirstOrDefault(k => k.KycId == acord.KycId.Value);
        var identity = _brokerProfiles.GetLegalIdentity(request.BrokerProfileId);
        var snapshot = DeserialiseOcr(acord?.OcrDataJson);

        return new BankConsentPdfInput
        {
            FullName = request.FullName,
            Telefon = request.Telefon,
            Email = request.Email,
            Cnp = supplied.Cnp,
            Address = string.IsNullOrWhiteSpace(supplied.Address) ? kycSession?.Address : supplied.Address,
            BirthDate = supplied.BirthDate ?? StoredBirthDate(request.AcordId),
            BrokerCompany = identity?.FirmaNume,
            BrokerRepresentative = identity?.ReprezentantNume,
            PlaceOfBirth = snapshot?.PlaceOfBirth,
            IdSeries = snapshot?.IdSeries,
            IdNumber = snapshot?.IdNumber,
            IssuedBy = snapshot?.IssuedBy,
            IssueDate = snapshot?.IssueDate,
            StareCivila = acord?.StareCivila,
            StareLocativa = acord?.StareLocativa,
            Studii = acord?.Studii,
            FunctieActuala = acord?.FunctieActuala,
            NumeFirma = acord?.NumeFirma,
            VechimeTotalaLuni = acord?.VechimeTotalaAni is { } ani ? (int)Math.Round(ani * 12) : null,
            SignedOn = ToRomaniaTime(signedOn),
            SignaturePng = signaturePng
        };
    }

    private int? UserIdFor(Guid acordId) =>
        _context.AcordClients.IgnoreQueryFilters()
            .Where(a => a.AcordId == acordId)
            .Select(a => (int?)a.UserId)
            .FirstOrDefault();

    private bool HasStoredCnp(Guid acordId)
    {
        var userId = UserIdFor(acordId);
        return userId.HasValue && (_subjectService.GetSubjectByUserId(userId.Value)?.HasStoredCnp ?? false);
    }

    /// <summary>
    /// The full CNP out of storage, or null when this subject predates it. Reading it is
    /// recorded against the client who is signing.
    /// </summary>
    private string? StoredCnp(BankConsentRequest request, string? ip, string? userAgent)
    {
        var userId = UserIdFor(request.AcordId);
        if (!userId.HasValue) return null;

        try
        {
            return _subjectService.RevealCnpByUserId(userId.Value, new CnpAccessContext
            {
                ActorUserId = userId.Value,
                ActorRole = "Client",
                Reason = "bank_consent_form",
                AcordId = request.AcordId,
                Ip = ip,
                UserAgent = userAgent
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not read the stored CNP for bank consent {RequestId}", request.Id);
            return null;
        }
    }

    /// <summary>
    /// The birth date the CNP itself carries, which outranks the document reader: the CNP
    /// is checksum-verified digits, the OCR value is a best-effort read of a photograph.
    /// Falls back to the OCR value for subjects whose CNP was never stored.
    /// </summary>
    private string? StoredBirthDate(Guid acordId)
    {
        var userId = UserIdFor(acordId);
        var derived = userId.HasValue ? _subjectService.GetSubjectByUserId(userId.Value)?.BirthDate : null;
        if (derived != null) return CnpIdentity.Format(derived);

        return FormatBirthDate(_context.AcordClients.IgnoreQueryFilters()
            .Where(a => a.AcordId == acordId)
            .Select(a => a.OcrDataJson)
            .FirstOrDefault());
    }

    /// <summary>
    /// Accepts what a client types and refuses anything that is not a plausible adult birth
    /// date, so a typo does not reach the bank as a valid-looking date.
    /// </summary>
    private static string? NormaliseBirthDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        if (!DateTime.TryParseExact(value.Trim(), BirthDateFormats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsed))
            return null;

        var today = DateTime.UtcNow.Date;
        var age = today.Year - parsed.Year - (parsed.Date > today.AddYears(-(today.Year - parsed.Year)) ? 1 : 0);
        return age is >= 18 and <= 100 ? parsed.ToString("dd.MM.yyyy") : null;
    }

    private string? StoredAddress(Guid acordId) =>
        (from a in _context.AcordClients.IgnoreQueryFilters()
         join k in _context.KycSessions on a.KycId equals k.KycId
         where a.AcordId == acordId
         select k.Address).FirstOrDefault();

    private string? LastFourOfMaskedCnp(Guid acordId)
    {
        var masked = (from a in _context.AcordClients.IgnoreQueryFilters()
                      join k in _context.KycSessions on a.KycId equals k.KycId
                      where a.AcordId == acordId
                      select k.Cnp).FirstOrDefault();

        var digits = new string((masked ?? string.Empty).Where(char.IsDigit).ToArray());
        return digits.Length == 4 ? digits : null;
    }

    /// <summary>
    /// The banks print the birth date as dd.MM.yyyy; the OCR hands it over in whichever
    /// shape the document used, so anything unparseable is left out rather than guessed.
    /// </summary>
    private static AcordOcrSnapshot? DeserialiseOcr(string? ocrDataJson)
    {
        if (string.IsNullOrWhiteSpace(ocrDataJson)) return null;

        try
        {
            return JsonSerializer.Deserialize<AcordOcrSnapshot>(ocrDataJson);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? FormatBirthDate(string? ocrDataJson) =>
        CnpIdentity.Format(CnpIdentity.ParseDocumentDate(DeserialiseOcr(ocrDataJson)?.BirthDate));

    private BankConsentRequest? FindByToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length != 64) return null;
        var hash = HashToken(token.ToLowerInvariant());
        return _context.BankConsentRequests.IgnoreQueryFilters().FirstOrDefault(r => r.TokenHash == hash);
    }

    private static string EffectiveStatus(BankConsentRequest request) =>
        request.Status == STATUS_PENDING && request.ExpiresAt <= DateTime.UtcNow ? STATUS_EXPIRED : request.Status;

    private static BankConsentInfo ToInfo(BankConsentRequest request) => new()
    {
        Id = request.Id,
        BankCode = request.BankCode,
        BankName = BankConsentCatalog.Find(request.BankCode)?.Name ?? request.BankCode,
        Status = EffectiveStatus(request),
        CreatedAt = request.CreatedAt,
        ExpiresAt = request.ExpiresAt,
        SignedAt = request.SignedAt,
        FileId = request.FileId
    };

    private static string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

    private static string? Truncate(string? value, int max) =>
        value == null ? null : value.Length <= max ? value : value[..max];

    private static DateTime ToRomaniaTime(DateTime utc)
    {
        try
        {
            var zone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Bucharest");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone);
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return utc;
        }
    }
}
