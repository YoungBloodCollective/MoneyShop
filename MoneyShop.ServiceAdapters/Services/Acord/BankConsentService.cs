using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Document;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using MoneyShop.ServiceInterface.Interfaces.Document;

namespace MoneyShop.ServiceAdapters.Services.Acord;

public class BankConsentService : IBankConsentService
{
    private const int LINK_VALIDITY_DAYS = 7;
    private const int ARCHIVE_YEARS = 5;
    private const int MAX_SIGNATURE_BYTES = 1024 * 1024;
    private const string STATUS_PENDING = "pending";
    private const string STATUS_SIGNING = "signing";
    private const string STATUS_SIGNED = "signed";
    private const string STATUS_REPLACED = "replaced";
    private const string STATUS_EXPIRED = "expired";
    private static readonly CultureInfo RomanianCulture = CultureInfo.GetCultureInfo("ro-RO");
    private static readonly byte[] PngMagic = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };

    private readonly MoneyShopDbContext _context;
    private readonly IPdfGenerationService _pdfGenerationService;
    private readonly ILogger<BankConsentService> _logger;

    public BankConsentService(MoneyShopDbContext context, IPdfGenerationService pdfGenerationService, ILogger<BankConsentService> logger)
    {
        _context = context;
        _pdfGenerationService = pdfGenerationService;
        _logger = logger;
    }

    public List<BankConsentBank> ListBanks() =>
        BankConsentCatalog.All.Select(b => new BankConsentBank { Code = b.Code, Name = b.Name }).ToList();

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

        view.Title = bank.Title;
        view.Body = bank.Body
            .Replace("{{NUME}}", request.FullName)
            .Replace("{{TELEFON}}", request.Telefon)
            .Replace("{{EMAIL}}", string.IsNullOrWhiteSpace(request.Email) ? "-" : request.Email);
        view.FullName = request.FullName;
        view.Telefon = request.Telefon;
        view.Email = request.Email;
        return view;
    }

    public BankConsentSignResult Sign(string token, byte[] signaturePng, string? ip, string? userAgent)
    {
        var request = FindByToken(token);
        if (request == null) return new BankConsentSignResult { NotFound = true, Error = "Linkul nu este valid" };

        var status = EffectiveStatus(request);
        if (status == STATUS_SIGNED) return new BankConsentSignResult { Error = "Consimtamantul a fost deja semnat" };
        if (status != STATUS_PENDING) return new BankConsentSignResult { Error = "Linkul a expirat. Cere brokerului un link nou." };

        if (signaturePng.Length == 0 || signaturePng.Length > MAX_SIGNATURE_BYTES || !signaturePng.AsSpan().StartsWith(PngMagic))
            return new BankConsentSignResult { Error = "Semnatura nu este valida" };

        var claimed = _context.BankConsentRequests
            .IgnoreQueryFilters()
            .Where(r => r.Id == request.Id && r.Status == STATUS_PENDING)
            .ExecuteUpdate(s => s.SetProperty(r => r.Status, STATUS_SIGNING));
        if (claimed == 0) return new BankConsentSignResult { Error = "Consimtamantul a fost deja semnat" };

        try
        {
            var acord = _context.AcordClients.IgnoreQueryFilters().First(a => a.AcordId == request.AcordId);
            var signedAt = DateTime.UtcNow;

            var pdf = _pdfGenerationService.GenerateBankConsentPdf(request.BankCode, new BankConsentPdfInput
            {
                FullName = request.FullName,
                Telefon = request.Telefon,
                Email = request.Email,
                SignedOn = ToRomaniaTime(signedAt),
                SignaturePng = signaturePng
            });

            var file = new KycFile
            {
                FileId = Guid.NewGuid(),
                KycId = acord.KycId!.Value,
                FileType = $"bank_consent_{request.BankCode}",
                FileName = $"consimtamant-{request.BankCode}-{acord.AcordId}.pdf",
                MimeType = "application/pdf",
                FileSize = pdf.LongLength,
                Sha256Hash = SHA256.HashData(pdf),
                FileContentBase64 = Convert.ToBase64String(pdf),
                CreatedAt = signedAt,
                ExpiresAt = signedAt.AddYears(ARCHIVE_YEARS)
            };
            _context.KycFiles.Add(file);

            request.Status = STATUS_SIGNED;
            request.SignedAt = signedAt;
            request.SignedIp = Truncate(ip, 64);
            request.SignedUserAgent = Truncate(userAgent, 500);
            request.FileId = file.FileId;
            _context.SaveChanges();

            _logger.LogInformation("Bank consent {RequestId} ({Bank}) signed for acord {AcordId}", request.Id, request.BankCode, acord.AcordId);
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
