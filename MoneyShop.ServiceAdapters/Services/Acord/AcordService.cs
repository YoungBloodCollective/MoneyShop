using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.DomainServices.RepositoryInterfaces.Acord;
using MoneyShop.DomainServices.RepositoryInterfaces.Account;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using MoneyShop.ServiceInterface.Interfaces.Kyc;
using MoneyShop.ServiceInterface.Interfaces.Subject;
using ConsentEntity = MoneyShop.DomainModel.Entities.Consent;

namespace MoneyShop.ServiceAdapters.Services.Acord;

public class AcordService : IAcordService
{
    private const int DEFAULT_RETENTION_DAYS = 30;
    private const int DEFAULT_LINK_VALIDITY_HOURS = 72;
    private const int CLIENT_ROLE_ID = 1;
    private const int MAX_STARTS_PER_IP_PER_HOUR = 10;

    private const string PLACEHOLDER_CONSENT = @"TEXT PROVIZORIU - A SE INLOCUI INAINTE DE PUNEREA IN FUNCTIUNE.

Prin semnarea acestui formular sunteti de acord ca datele dumneavoastra cu caracter personal, inclusiv copia actului de identitate si dovada de adresa incarcate mai sus, sa fie prelucrate in scopul analizei de eligibilitate si al intermedierii unui credit.

Datele sunt pastrate pentru o perioada limitata si sunt sterse automat la expirarea acesteia. Aveti dreptul de acces, rectificare, stergere, restrictionare, opozitie si portabilitate a datelor.

ATENTIE: acest text este un substituent tehnic. Textul legal final (GDPR si acord de intermediere) trebuie furnizat de operator si configurat in Acord:ConsentText.";

    private readonly IAcordClientRepository _acordRepository;
    private readonly IKycSessionRepository _kycSessionRepository;
    private readonly IKycFileRepository _kycFileRepository;
    private readonly IUserRepository _userRepository;
    private readonly IExternalKycService _externalKyc;
    private readonly ISubjectService _subjectService;
    private readonly MoneyShopDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AcordService> _logger;

    public AcordService(
        IAcordClientRepository acordRepository,
        IKycSessionRepository kycSessionRepository,
        IKycFileRepository kycFileRepository,
        IUserRepository userRepository,
        IExternalKycService externalKyc,
        ISubjectService subjectService,
        MoneyShopDbContext context,
        IConfiguration configuration,
        ILogger<AcordService> logger)
    {
        _acordRepository = acordRepository;
        _kycSessionRepository = kycSessionRepository;
        _kycFileRepository = kycFileRepository;
        _userRepository = userRepository;
        _externalKyc = externalKyc;
        _subjectService = subjectService;
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    private int RetentionDays =>
        _configuration.GetValue<int?>("Acord:RetentionDays") ?? DEFAULT_RETENTION_DAYS;

    private int LinkValidityHours =>
        _configuration.GetValue<int?>("Acord:LinkValidityHours") ?? DEFAULT_LINK_VALIDITY_HOURS;

    // ── Public flow ──

    public Task<AcordStartResult> StartAsync(AcordStartInput input)
    {
        var telefon = NormalisePhone(input.Telefon);
        var email = string.IsNullOrWhiteSpace(input.Email) ? null : input.Email.Trim().ToLowerInvariant();

        if (IsIpRateLimited(input.Ip, telefon))
        {
            _logger.LogWarning("Acord start rate limited for ip {Ip}", input.Ip);
            return Task.FromResult(new AcordStartResult { RateLimited = true });
        }

        var user = FindOrCreateUser(input.Nume.Trim(), input.Prenume.Trim(), telefon, email);

        var existing = _acordRepository.Get()
            .Where(a => a.UserId == user.IdUtilizator
                        && a.Status != "completed"
                        && a.Status != "rejected"
                        && a.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefault();

        if (existing != null)
        {
            return Task.FromResult(new AcordStartResult
            {
                AcordId = existing.AcordId,
                Token = existing.Token,
                ExpiresAt = existing.ExpiresAt,
                IsResumed = true
            });
        }

        var expiresAt = DateTime.UtcNow.AddHours(LinkValidityHours);
        var token = GenerateToken();

        // The external KYC session is created lazily, on first document upload.
        // Doing it here made the client wait on a cold-start HTTP round-trip
        // immediately after filling in their name.
        var kycSession = new KycSession
        {
            KycId = Guid.NewGuid(),
            UserId = user.IdUtilizator,
            KycType = "ACORD_CLIENT",
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt,
            ProviderTransactionId = null,
            Token = null
        };
        _kycSessionRepository.Insert(kycSession);

        var acord = new AcordClient
        {
            AcordId = Guid.NewGuid(),
            UserId = user.IdUtilizator,
            KycId = kycSession.KycId,
            Token = token,
            Nume = input.Nume.Trim(),
            Prenume = input.Prenume.Trim(),
            Telefon = telefon,
            Email = email,
            AgentCode = string.IsNullOrWhiteSpace(input.AgentCode) ? null : input.AgentCode.Trim(),
            CreatedIp = input.Ip,
            Status = "started",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt
        };
        _acordRepository.Insert(acord);
        _context.SaveChanges();

        _logger.LogInformation("Acord session started {AcordId} for user {UserId}", acord.AcordId, user.IdUtilizator);

        return Task.FromResult(new AcordStartResult
        {
            AcordId = acord.AcordId,
            Token = token,
            ExpiresAt = expiresAt,
            IsResumed = false
        });
    }

    /// <summary>
    /// Creates the external KYC session on demand. Returns false when the
    /// service is unreachable, in which case the flow continues collecting
    /// documents without automatic checks.
    /// </summary>
    private async Task<bool> EnsureProviderSessionAsync(KycSession kycSession)
    {
        if (!string.IsNullOrEmpty(kycSession.ProviderTransactionId)) return true;

        try
        {
            var externalSession = await _externalKyc.CreateSessionAsync();
            kycSession.ProviderTransactionId = externalSession.SessionId;
            kycSession.Token = externalSession.Token;
            _context.SaveChanges();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not create external KYC session; continuing in upload-only mode");
            return false;
        }
    }

    public AcordSessionView? GetByToken(string token)
    {
        var acord = FindByToken(token);
        if (acord == null) return null;

        return new AcordSessionView
        {
            AcordId = acord.AcordId,
            Nume = acord.Nume,
            Prenume = acord.Prenume,
            Status = acord.Status,
            HasIdFront = acord.HasIdFront,
            HasIdBack = acord.HasIdBack,
            HasSelfie = acord.HasSelfie,
            HasProofOfAddress = acord.HasProofOfAddress,
            RequiresProofOfAddress = acord.RequiresProofOfAddress,
            IsSigned = acord.SignedAt.HasValue,
            ExpiresAt = acord.ExpiresAt
        };
    }

    public async Task<AcordDocumentResult> SubmitDocumentAsync(string token, byte[] front, string frontMime, byte[]? back, string? backMime)
    {
        var acord = FindByToken(token);
        if (acord == null)
            return new AcordDocumentResult { Accepted = false, Message = "Sesiune invalida sau expirata" };

        // The images are persisted first and unconditionally. Collecting the document is the
        // primary purpose of this flow; OCR is a convenience on top of it.
        PersistFile(acord, "id_front", front, "id-front.jpg", frontMime);
        acord.HasIdFront = true;

        if (back != null && back.Length > 0)
        {
            PersistFile(acord, "id_back", back, "id-back.jpg", backMime ?? "image/jpeg");
            acord.HasIdBack = true;
        }

        var result = new AcordDocumentResult { Accepted = true };

        var kycSession = GetKycSession(acord);
        if (kycSession != null && await EnsureProviderSessionAsync(kycSession))
        {
            try
            {
                var ocr = await _externalKyc.SubmitDocumentOcrAsync(
                    kycSession.ProviderTransactionId!, kycSession.Token!, front, back);

                result.OcrData = ocr.OcrData;
                result.Validation = ocr.LogicValidation;

                if (ocr.OcrData != null)
                {
                    acord.IdIsNewFormat = ocr.OcrData.IsNewFormat;
                    result.IsNewFormat = ocr.OcrData.IsNewFormat;

                    // A new-type Romanian ID does not print the holder's address, so OCR
                    // returns an empty address field. That is the dependable signal - the
                    // format flag alone can be wrong.
                    acord.RequiresProofOfAddress =
                        ocr.OcrData.IsNewFormat || string.IsNullOrWhiteSpace(ocr.OcrData.Address);

                    StoreIdentityData(acord, kycSession, ocr.OcrData, ocr.LogicValidation);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OCR failed for acord {AcordId}; document kept", acord.AcordId);
                result.Message = "Documentul a fost salvat, dar citirea automata nu a reusit.";
            }
        }

        acord.Status = "documents";
        acord.UpdatedAt = DateTime.UtcNow;
        _context.SaveChanges();

        result.RequiresProofOfAddress = acord.RequiresProofOfAddress;
        return result;
    }

    public async Task<AcordLivenessResult> SubmitLivenessAsync(string token, byte[] selfie, string selfieMime)
    {
        var acord = FindByToken(token);
        if (acord == null)
            return new AcordLivenessResult { Passed = false, Message = "Sesiune invalida sau expirata" };

        PersistFile(acord, "selfie", selfie, "selfie.jpg", selfieMime);
        acord.HasSelfie = true;

        var outcome = new AcordLivenessResult { Passed = true };

        var kycSession = GetKycSession(acord);
        if (kycSession != null && await EnsureProviderSessionAsync(kycSession))
        {
            try
            {
                var liveness = await _externalKyc.SubmitLivenessAsync(
                    kycSession.ProviderTransactionId!, kycSession.Token!, selfie);

                acord.LivenessPassed = liveness.LivenessDetected;
                acord.LivenessConfidence = liveness.Confidence;
                outcome.Passed = liveness.LivenessDetected;
                outcome.Confidence = liveness.Confidence;

                await TryFaceCompareAsync(acord, kycSession, selfie);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Liveness failed for acord {AcordId}; selfie kept", acord.AcordId);
                outcome.Message = "Verificarea faciala nu a putut fi finalizata.";
            }
        }

        acord.UpdatedAt = DateTime.UtcNow;
        _context.SaveChanges();

        // Liveness never blocks the flow - the result is recorded for the operator to review.
        return outcome;
    }

    public Task<bool> SubmitProofOfAddressAsync(string token, byte[] content, string fileName, string mimeType)
    {
        var acord = FindByToken(token);
        if (acord == null) return Task.FromResult(false);

        PersistFile(acord, "proof_of_address", content, fileName, mimeType);
        acord.HasProofOfAddress = true;
        acord.UpdatedAt = DateTime.UtcNow;
        _context.SaveChanges();

        return Task.FromResult(true);
    }

    public Task<AcordSignResult> SignAsync(string token, byte[] signaturePng, AcordSignChoices choices, AcordSignContext context)
    {
        var acord = FindByToken(token);
        if (acord == null)
            return Task.FromResult(new AcordSignResult { Success = false, Message = "Sesiune invalida sau expirata" });

        if (!choices.AcceptIntermediere)
            return Task.FromResult(new AcordSignResult { Success = false, Message = "Acordul pentru prelucrarea datelor este obligatoriu" });

        if (!acord.HasIdFront)
            return Task.FromResult(new AcordSignResult { Success = false, Message = "Incarca mai intai actul de identitate" });

        if (acord.RequiresProofOfAddress && !acord.HasProofOfAddress)
            return Task.FromResult(new AcordSignResult { Success = false, Message = "Dovada de adresa este obligatorie pentru actul de identitate incarcat" });

        if (acord.SignedAt.HasValue)
            return Task.FromResult(new AcordSignResult { Success = true, ConsentId = acord.ConsentId, SignedAt = acord.SignedAt });

        var consentText = GetConsentText();
        var legalDoc = GetOrCreateLegalDoc(consentText);

        PersistFile(acord, "signature", signaturePng, "signature.png", "image/png");

        // Each opt-in is recorded as its own consent. Marketing and the OUG 52/2016
        // waiver are optional, so bundling them into one record would make none of
        // them a freely given consent.
        var primary = RecordConsent(acord, legalDoc, consentText, "ACORD_INTERMEDIERE", context);

        if (choices.AcceptMarketing)
            RecordConsent(acord, legalDoc, consentText, "ACORD_MARKETING", context);

        if (choices.WaiveOug52)
            RecordConsent(acord, legalDoc, consentText, "ACORD_OUG52_WAIVER", context);

        acord.ConsentId = primary.ConsentId;
        acord.ConsentVersion = consentText.Version;
        acord.MarketingAccepted = choices.AcceptMarketing;
        acord.Oug52Waived = choices.WaiveOug52;
        acord.SignedAt = DateTime.UtcNow;
        acord.CompletedAt = DateTime.UtcNow;
        acord.Status = "completed";
        acord.UpdatedAt = DateTime.UtcNow;

        var kycSession = GetKycSession(acord);
        if (kycSession != null)
        {
            kycSession.Status = "verified";
            kycSession.VerifiedAt = DateTime.UtcNow;
        }

        _context.SaveChanges();

        _logger.LogInformation(
            "Acord {AcordId} signed by user {UserId} (marketing: {Marketing}, oug52 waiver: {Waiver})",
            acord.AcordId, acord.UserId, choices.AcceptMarketing, choices.WaiveOug52);

        return Task.FromResult(new AcordSignResult
        {
            Success = true,
            ConsentId = primary.ConsentId,
            SignedAt = acord.SignedAt
        });
    }

    private ConsentEntity RecordConsent(AcordClient acord, LegalDoc legalDoc, AcordConsentText text, string consentType, AcordSignContext context)
    {
        var consent = new ConsentEntity
        {
            ConsentId = Guid.NewGuid(),
            UserId = acord.UserId,
            ConsentType = consentType,
            Status = "granted",
            GrantedAt = DateTime.UtcNow,
            DocId = legalDoc.DocId,
            ConsentTextSnapshot = text.Body,
            Ip = context.Ip,
            UserAgent = context.UserAgent,
            SourceChannel = context.SourceChannel
        };

        _context.Consents.Add(consent);
        return consent;
    }

    public AcordConsentText GetConsentText()
    {
        var version = _configuration["Acord:ConsentVersion"];
        var title = _configuration["Acord:ConsentTitle"];
        var body = LoadConsentBody(out var isPlaceholder);

        return new AcordConsentText
        {
            Version = string.IsNullOrWhiteSpace(version) ? "0.0-placeholder" : version,
            Title = string.IsNullOrWhiteSpace(title) ? "Acord privind prelucrarea datelor" : title,
            Body = body,
            IsPlaceholder = isPlaceholder,
            Options = BuildOptions()
        };
    }

    private string LoadConsentBody(out bool isPlaceholder)
    {
        isPlaceholder = false;

        var inline = _configuration["Acord:ConsentText"];
        if (!string.IsNullOrWhiteSpace(inline)) return inline;

        var relativePath = _configuration["Acord:ConsentTextPath"];
        if (!string.IsNullOrWhiteSpace(relativePath))
        {
            var fullPath = Path.IsPathRooted(relativePath)
                ? relativePath
                : Path.Combine(AppContext.BaseDirectory, relativePath);

            try
            {
                if (File.Exists(fullPath))
                {
                    var fromFile = File.ReadAllText(fullPath, Encoding.UTF8);
                    if (!string.IsNullOrWhiteSpace(fromFile)) return fromFile;
                }

                _logger.LogError("Consent text file not found at {Path}", fullPath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not read consent text file at {Path}", fullPath);
            }
        }

        isPlaceholder = true;
        return PLACEHOLDER_CONSENT;
    }

    private static List<AcordConsentOption> BuildOptions() => new()
    {
        new AcordConsentOption
        {
            Key = "intermediere",
            Label = "Sunt de acord cu prelucrarea datelor mele in scopul intermedierii creditului.",
            Hint = "Fara acest acord, cererea nu poate fi analizata si transmisa.",
            Required = true
        },
        new AcordConsentOption
        {
            Key = "marketing",
            Label = "Sunt de acord sa primesc comunicari comerciale si oferte.",
            Hint = "Optional. Refuzul nu afecteaza serviciile de intermediere.",
            Required = false
        },
        new AcordConsentOption
        {
            Key = "oug52Waiver",
            Label = "Solicit inceperea imediata a serviciilor si, in masura permisa de lege, renunt la perioada de asteptare.",
            Hint = "Optional, conform OUG nr. 52/2016.",
            Required = false
        }
    };

    // ── Admin ──

    public List<AcordListItem> ListForAdmin(string? status, string? search)
    {
        var query = _acordRepository.Get().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(a => a.Nume.Contains(term)
                                     || a.Prenume.Contains(term)
                                     || a.Telefon.Contains(term)
                                     || (a.Email != null && a.Email.Contains(term)));
        }

        var items = query.OrderByDescending(a => a.CreatedAt).Take(500).ToList();
        var kycIds = items.Where(i => i.KycId.HasValue).Select(i => i.KycId!.Value).ToList();

        var fileCounts = _kycFileRepository.Get()
            .Where(f => kycIds.Contains(f.KycId) && f.DeletedAt == null)
            .GroupBy(f => f.KycId)
            .Select(g => new { KycId = g.Key, Count = g.Count() })
            .ToDictionary(x => x.KycId, x => x.Count);

        return items.Select(a => new AcordListItem
        {
            AcordId = a.AcordId,
            Nume = a.Nume,
            Prenume = a.Prenume,
            Telefon = a.Telefon,
            Email = a.Email,
            Status = a.Status,
            AgentCode = a.AgentCode,
            IsSigned = a.SignedAt.HasValue,
            MarketingAccepted = a.MarketingAccepted,
            LivenessPassed = a.LivenessPassed,
            FaceMatchPassed = a.FaceMatchPassed,
            FileCount = a.KycId.HasValue && fileCounts.ContainsKey(a.KycId.Value) ? fileCounts[a.KycId.Value] : 0,
            CreatedAt = a.CreatedAt,
            CompletedAt = a.CompletedAt,
            ExpiresAt = a.ExpiresAt
        }).ToList();
    }

    public AcordDetails? GetDetailsForAdmin(Guid acordId)
    {
        var acord = _acordRepository.Get().FirstOrDefault(a => a.AcordId == acordId);
        if (acord == null) return null;

        var kycSession = GetKycSession(acord);

        var details = new AcordDetails
        {
            AcordId = acord.AcordId,
            UserId = acord.UserId,
            Nume = acord.Nume,
            Prenume = acord.Prenume,
            Telefon = acord.Telefon,
            Email = acord.Email,
            AgentCode = acord.AgentCode,
            Status = acord.Status,
            IdIsNewFormat = acord.IdIsNewFormat,
            LivenessPassed = acord.LivenessPassed,
            LivenessConfidence = acord.LivenessConfidence,
            FaceMatchPassed = acord.FaceMatchPassed,
            FaceMatchConfidence = acord.FaceMatchConfidence,
            ReviewNote = acord.ReviewNote,
            SignedAt = acord.SignedAt,
            MarketingAccepted = acord.MarketingAccepted,
            Oug52Waived = acord.Oug52Waived,
            CreatedAt = acord.CreatedAt,
            CompletedAt = acord.CompletedAt,
            ExpiresAt = acord.ExpiresAt,
            CnpMasked = kycSession?.Cnp,
            Address = kycSession?.Address,
            AutomaticChecksRan = !string.IsNullOrEmpty(kycSession?.ProviderTransactionId),
            Ocr = DeserialiseOcr(acord.OcrDataJson)
        };

        if (acord.ConsentId.HasValue)
        {
            var consent = _context.Consents.FirstOrDefault(c => c.ConsentId == acord.ConsentId.Value);
            if (consent != null)
            {
                details.ConsentTextSnapshot = consent.ConsentTextSnapshot;
                details.ConsentIp = consent.Ip;
                var doc = consent.DocId.HasValue
                    ? _context.LegalDocs.FirstOrDefault(d => d.DocId == consent.DocId.Value)
                    : null;
                details.ConsentVersion = doc?.Version ?? acord.ConsentVersion;
            }
        }

        if (acord.KycId.HasValue)
        {
            details.Files = _kycFileRepository.Get()
                .Where(f => f.KycId == acord.KycId.Value)
                .OrderBy(f => f.CreatedAt)
                .Select(f => new AcordFileInfo
                {
                    FileId = f.FileId,
                    FileType = f.FileType,
                    FileName = f.FileName,
                    MimeType = f.MimeType,
                    FileSize = f.FileSize,
                    CreatedAt = f.CreatedAt,
                    ExpiresAt = f.ExpiresAt,
                    IsDeleted = f.DeletedAt != null
                })
                .ToList();
        }

        return details;
    }

    public AcordFileContent? GetFileForAdmin(Guid fileId)
    {
        var file = _kycFileRepository.Get().FirstOrDefault(f => f.FileId == fileId);
        if (file == null || file.DeletedAt != null || string.IsNullOrEmpty(file.FileContentBase64))
            return null;

        return new AcordFileContent
        {
            FileName = file.FileName,
            MimeType = file.MimeType,
            Content = Convert.FromBase64String(file.FileContentBase64)
        };
    }

    public bool UpdateStatusForAdmin(Guid acordId, string status, string? reviewNote)
    {
        var acord = _acordRepository.Get().FirstOrDefault(a => a.AcordId == acordId);
        if (acord == null) return false;

        acord.Status = status;
        acord.ReviewNote = reviewNote;
        acord.UpdatedAt = DateTime.UtcNow;
        _context.SaveChanges();
        return true;
    }

    // ── Helpers ──

    private bool IsIpRateLimited(string? ip, string telefon)
    {
        if (string.IsNullOrWhiteSpace(ip)) return false;

        var since = DateTime.UtcNow.AddHours(-1);
        var recent = _acordRepository.Get()
            .Count(a => a.CreatedIp == ip && a.CreatedAt >= since && a.Telefon != telefon);

        return recent >= MAX_STARTS_PER_IP_PER_HOUR;
    }

    private AcordClient? FindByToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var acord = _acordRepository.Get().FirstOrDefault(a => a.Token == token);
        if (acord == null) return null;
        if (acord.ExpiresAt < DateTime.UtcNow) return null;

        return acord;
    }

    private KycSession? GetKycSession(AcordClient acord)
    {
        if (!acord.KycId.HasValue) return null;
        return _kycSessionRepository.Get().FirstOrDefault(k => k.KycId == acord.KycId.Value);
    }

    private Utilizatori FindOrCreateUser(string nume, string prenume, string telefon, string? email)
    {
        var existing = _userRepository.Get()
            .FirstOrDefault(u => u.NumarTelefon == telefon && u.IsDeleted != true);

        if (existing == null && !string.IsNullOrWhiteSpace(email))
        {
            existing = _userRepository.Get()
                .FirstOrDefault(u => u.Mail == email && u.IsDeleted != true);
        }

        if (existing != null)
        {
            if (string.IsNullOrWhiteSpace(existing.Mail) && !string.IsNullOrWhiteSpace(email))
                existing.Mail = email;
            if (string.IsNullOrWhiteSpace(existing.NumarTelefon))
                existing.NumarTelefon = telefon;
            return existing;
        }

        var user = new Utilizatori
        {
            Nume = nume,
            Prenume = prenume,
            NumarTelefon = telefon,
            Mail = email,
            Username = null,
            Parola = null,
            EmailVerified = false,
            PhoneVerified = false,
            IdRol = CLIENT_ROLE_ID,
            IsDeleted = false
        };

        _userRepository.Insert(user);
        _context.SaveChanges();

        return user;
    }

    private void StoreIdentityData(AcordClient acord, KycSession kycSession, OcrData ocr, LogicValidation? validation)
    {
        string? cnpMasked = null;

        if (!string.IsNullOrWhiteSpace(ocr.Cnp))
        {
            try
            {
                // The raw CNP is never persisted - only the peppered hash in
                // SubjectMap plus a masked form for display.
                cnpMasked = _subjectService.GetOrCreateSubject(acord.UserId, ocr.Cnp).CnpMasked;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not pseudonymise CNP for acord {AcordId}", acord.AcordId);
            }
        }

        kycSession.Cnp = cnpMasked;

        if (!string.IsNullOrWhiteSpace(ocr.Address))
            kycSession.Address = ocr.Address;

        var snapshot = new AcordOcrSnapshot
        {
            LastName = ocr.LastName,
            FirstName = ocr.FirstName,
            CnpMasked = cnpMasked,
            IdSeries = ocr.IdSeries,
            IdNumber = ocr.IdNumber,
            BirthDate = ocr.BirthDate,
            Sex = ocr.Sex,
            PlaceOfBirth = ocr.PlaceOfBirth,
            Address = ocr.Address,
            Nationality = ocr.Nationality,
            IssuedBy = ocr.IssuedBy,
            IssueDate = ocr.IssueDate,
            ExpiryDate = ocr.ExpiryDate,
            ConfidenceScore = ocr.ConfidenceScore,
            IsNewFormat = ocr.IsNewFormat,
            CnpChecksumValid = validation?.CnpChecksumValid,
            CnpBirthDateMatch = validation?.CnpBirthDateMatch,
            CnpSexMatch = validation?.CnpSexMatch,
            DocumentNotExpired = validation?.DocumentNotExpired,
            ValidationErrors = validation?.Errors ?? new List<string>()
        };

        acord.OcrDataJson = JsonSerializer.Serialize(snapshot);
    }

    private async Task TryFaceCompareAsync(AcordClient acord, KycSession kycSession, byte[] selfie)
    {
        if (!acord.KycId.HasValue) return;

        var front = _kycFileRepository.Get()
            .Where(f => f.KycId == acord.KycId.Value && f.FileType == "id_front" && f.DeletedAt == null)
            .OrderByDescending(f => f.CreatedAt)
            .FirstOrDefault();

        if (front?.FileContentBase64 == null) return;

        try
        {
            var frontBytes = Convert.FromBase64String(front.FileContentBase64);
            var compare = await _externalKyc.SubmitFaceCompareAsync(
                kycSession.ProviderTransactionId!, kycSession.Token!, frontBytes, selfie);

            acord.FaceMatchPassed = compare.FacesMatch;
            acord.FaceMatchConfidence = compare.Confidence;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Face compare failed for acord {AcordId}", acord.AcordId);
        }
    }

    private void PersistFile(AcordClient acord, string fileType, byte[] content, string fileName, string mimeType)
    {
        if (!acord.KycId.HasValue)
            throw new InvalidOperationException("Acord session has no KYC session to attach files to");

        byte[] hash;
        using (var sha256 = SHA256.Create())
        {
            hash = sha256.ComputeHash(content);
        }

        var existing = _kycFileRepository.Get()
            .FirstOrDefault(f => f.KycId == acord.KycId.Value && f.FileType == fileType && f.DeletedAt == null);

        if (existing != null)
        {
            existing.FileName = fileName;
            existing.MimeType = mimeType;
            existing.FileSize = content.LongLength;
            existing.Sha256Hash = hash;
            existing.FileContentBase64 = Convert.ToBase64String(content);
            existing.CreatedAt = DateTime.UtcNow;
            existing.ExpiresAt = DateTime.UtcNow.AddDays(RetentionDays);
            _kycFileRepository.Update(existing);
            return;
        }

        var file = new KycFile
        {
            FileId = Guid.NewGuid(),
            KycId = acord.KycId.Value,
            FileType = fileType,
            FileName = fileName,
            MimeType = mimeType,
            FileSize = content.LongLength,
            Sha256Hash = hash,
            FileContentBase64 = Convert.ToBase64String(content),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(RetentionDays)
        };

        _kycFileRepository.Insert(file);
    }

    private LegalDoc GetOrCreateLegalDoc(AcordConsentText consentText)
    {
        byte[] contentHash;
        using (var sha256 = SHA256.Create())
        {
            contentHash = sha256.ComputeHash(Encoding.UTF8.GetBytes(consentText.Body));
        }

        var existing = _context.LegalDocs
            .FirstOrDefault(d => d.DocType == "ACORD_CLIENT" && d.Version == consentText.Version);

        if (existing != null) return existing;

        var doc = new LegalDoc
        {
            DocId = Guid.NewGuid(),
            DocType = "ACORD_CLIENT",
            Version = consentText.Version,
            PublishedAt = DateTime.UtcNow,
            ContentHash = contentHash,
            IsActive = true
        };

        _context.LegalDocs.Add(doc);
        _context.SaveChanges();

        return doc;
    }

    private AcordOcrSnapshot? DeserialiseOcr(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;

        try
        {
            return JsonSerializer.Deserialize<AcordOcrSnapshot>(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read stored OCR snapshot");
            return null;
        }
    }

    /// <summary>
    /// Identity data extracted from the document is personal data, so it is
    /// cleared on the same retention clock as the scans themselves.
    /// </summary>
    public int PurgeExpiredOcrData()
    {
        var cutoff = DateTime.UtcNow.AddDays(-RetentionDays);

        var stale = _acordRepository.Get()
            .Where(a => a.OcrDataJson != null && a.CreatedAt < cutoff)
            .ToList();

        foreach (var acord in stale)
        {
            acord.OcrDataJson = null;
            _acordRepository.Update(acord);
        }

        if (stale.Count > 0) _context.SaveChanges();
        return stale.Count;
    }

    private static string NormalisePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("40") && digits.Length == 11) return "0" + digits.Substring(2);
        if (digits.StartsWith("0040") && digits.Length == 13) return "0" + digits.Substring(4);
        return digits;
    }

    private static string GenerateToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
