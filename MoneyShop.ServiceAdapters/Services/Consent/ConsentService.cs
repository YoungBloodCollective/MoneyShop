using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Consent;
using MoneyShop.DomainServices.RepositoryInterfaces.Consent;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using ConsentEntity = MoneyShop.DomainModel.Entities.Consent;

namespace MoneyShop.ServiceAdapters.Services.Consent;

public class ConsentService : IConsentService
{
    private readonly IConsentRepository _consentRepository;
    private readonly ILegalDocRepository _legalDocRepository;
    private readonly MoneyShopDbContext _context;

    public ConsentService(
        IConsentRepository consentRepository,
        ILegalDocRepository legalDocRepository,
        MoneyShopDbContext context)
    {
        _consentRepository = consentRepository;
        _legalDocRepository = legalDocRepository;
        _context = context;
    }

    public ConsentGrantResult GrantConsent(
        int userId,
        string consentType,
        string docType,
        string docVersion,
        string consentTextSnapshot,
        Guid? sessionId,
        string? ip,
        string? userAgent,
        byte[]? deviceHash,
        string sourceChannel)
    {
        // Find or create legal doc
        var legalDoc = _legalDocRepository.Get()
            .FirstOrDefault(d => d.DocType == docType && d.Version == docVersion && d.IsActive);

        if (legalDoc == null)
        {
            // Create new legal doc entry
            var contentHash = ComputeContentHash(consentTextSnapshot);
            legalDoc = new LegalDoc
            {
                DocId = Guid.NewGuid(),
                DocType = docType,
                Version = docVersion,
                PublishedAt = DateTime.UtcNow,
                ContentHash = contentHash,
                IsActive = true
            };
            _legalDocRepository.Insert(legalDoc);
        }

        // Create consent
        var consent = new ConsentEntity
        {
            ConsentId = Guid.NewGuid(),
            UserId = userId,
            ConsentType = consentType,
            Status = "granted",
            GrantedAt = DateTime.UtcNow,
            DocId = legalDoc.DocId,
            ConsentTextSnapshot = consentTextSnapshot,
            SessionId = sessionId,
            Ip = ip,
            UserAgent = userAgent,
            DeviceHash = deviceHash,
            SourceChannel = sourceChannel
        };

        _consentRepository.Insert(consent);
        _context.SaveChanges();

        return new ConsentGrantResult
        {
            ConsentId = consent.ConsentId,
            Status = consent.Status,
            GrantedAt = consent.GrantedAt
        };
    }

    public bool RevokeConsent(Guid consentId, int userId)
    {
        var consent = _consentRepository.Get()
            .FirstOrDefault(c => c.ConsentId == consentId && c.UserId == userId);

        if (consent == null || consent.Status == "revoked")
        {
            return false;
        }

        consent.Status = "revoked";
        consent.RevokedAt = DateTime.UtcNow;
        _consentRepository.Update(consent);
        _context.SaveChanges();

        return true;
    }

    public List<ConsentInfo> GetUserConsents(int userId)
    {
        return _consentRepository.Get()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.GrantedAt)
            .Select(c => new ConsentInfo
            {
                ConsentId = c.ConsentId,
                ConsentType = c.ConsentType,
                Status = c.Status,
                GrantedAt = c.GrantedAt,
                RevokedAt = c.RevokedAt,
                DocType = c.Doc != null ? c.Doc.DocType : null,
                DocVersion = c.Doc != null ? c.Doc.Version : null
            })
            .ToList();
    }

    private byte[] ComputeContentHash(string content)
    {
        using var sha256 = SHA256.Create();
        return sha256.ComputeHash(Encoding.UTF8.GetBytes(content));
    }
}
