using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Subject;
using MoneyShop.DomainServices.RepositoryInterfaces.Subject;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using SubjectMapEntity = MoneyShop.DomainModel.Entities.SubjectMap;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MoneyShop.ServiceAdapters.Services.Subject;

public class SubjectService : ISubjectService
{
    private readonly ISubjectMapRepository _subjectMapRepository;
    private readonly ICnpAccessLogRepository _cnpAccessLogRepository;
    private readonly ICnpProtector _cnpProtector;
    private readonly MoneyShopDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SubjectService> _logger;
    private const string PEPPER1_KEY = "Subject:Pepper1";
    private const string PEPPER2_KEY = "Subject:Pepper2";

    public SubjectService(
        ISubjectMapRepository subjectMapRepository,
        ICnpAccessLogRepository cnpAccessLogRepository,
        ICnpProtector cnpProtector,
        MoneyShopDbContext context,
        IConfiguration configuration,
        ILogger<SubjectService> logger)
    {
        _subjectMapRepository = subjectMapRepository;
        _cnpAccessLogRepository = cnpAccessLogRepository;
        _cnpProtector = cnpProtector;
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Creates or gets a subject_id for a user based on CNP. This is the one place the raw
    /// CNP enters the system, so it is also where it is encrypted and where sex and birth
    /// date are derived - reads afterwards never need the plaintext.
    /// </summary>
    public SubjectMapResult GetOrCreateSubject(int userId, string cnp)
    {
        if (string.IsNullOrWhiteSpace(cnp))
        {
            throw new ArgumentException("CNP cannot be empty", nameof(cnp));
        }

        var pepper1 = GetPepper(PEPPER1_KEY);
        var pepper2 = GetPepper(PEPPER2_KEY);

        var cnpHash = ComputeCnpHash(cnp, pepper1);

        // EF translates == on byte[] to a binary comparison in SQL; SequenceEqual does not
        // translate and throws at query time, so the lookup has to use ==.
        var existingSubject = _subjectMapRepository.Get()
            .FirstOrDefault(s => s.CnpHash == cnpHash);

        if (existingSubject != null)
        {
            // A subject created before the CNP was kept - or while no key was configured -
            // has the plaintext in hand right now and will not again, so it is filled in.
            if (Enrich(existingSubject, cnp))
                _context.SaveChanges();

            return ToResult(existingSubject, isNew: false);
        }

        var subjectId = GenerateSubjectId(cnp, pepper2);
        var cnpLast4 = cnp.Length >= 4 ? cnp.Substring(cnp.Length - 4) : null;

        var subject = new SubjectMapEntity
        {
            SubjectId = subjectId,
            UserId = userId,
            CnpHash = cnpHash,
            CnpLast4 = cnpLast4,
            CreatedAt = DateTime.UtcNow
        };

        Enrich(subject, cnp);

        _subjectMapRepository.Insert(subject);
        _context.SaveChanges();

        return ToResult(subject, isNew: true);
    }

    /// <summary>
    /// Gets subject by user ID
    /// </summary>
    public SubjectMapResult? GetSubjectByUserId(int userId)
    {
        var subject = _subjectMapRepository.Get()
            .FirstOrDefault(s => s.UserId == userId);

        return subject == null ? null : ToResult(subject, isNew: false);
    }

    /// <summary>
    /// Gets subject by subject_id
    /// </summary>
    public SubjectMapResult? GetSubjectById(string subjectId)
    {
        var subject = _subjectMapRepository.Get()
            .FirstOrDefault(s => s.SubjectId == subjectId);

        return subject == null ? null : ToResult(subject, isNew: false);
    }

    public string? RevealCnpByUserId(int userId, CnpAccessContext access)
    {
        if (access == null) throw new ArgumentNullException(nameof(access));
        if (string.IsNullOrWhiteSpace(access.Reason))
            throw new ArgumentException("A reason is required to read a CNP", nameof(access));

        var subject = _subjectMapRepository.Get()
            .FirstOrDefault(s => s.UserId == userId);

        if (subject?.CnpEncrypted == null) return null;

        var cnp = _cnpProtector.Unprotect(subject.CnpEncrypted);
        if (cnp == null) return null;

        // Recorded before the value is handed over, so a caller that fails downstream still
        // leaves the reading on the record.
        _cnpAccessLogRepository.Insert(new CnpAccessLog
        {
            Id = Guid.NewGuid(),
            SubjectId = subject.SubjectId,
            ActorUserId = access.ActorUserId,
            ActorRole = Truncate(access.ActorRole, 50),
            Reason = Truncate(access.Reason, 100)!,
            AcordId = access.AcordId,
            Ip = Truncate(access.Ip, 64),
            UserAgent = Truncate(access.UserAgent, 500),
            AccessedAt = DateTime.UtcNow
        });
        _context.SaveChanges();

        return cnp;
    }

    /// <summary>
    /// Fills in everything derived from the plaintext CNP. Returns true when the row changed.
    /// A missing encryption key is not fatal: the subject still works for matching and
    /// masking, it simply carries no stored CNP.
    /// </summary>
    private bool Enrich(SubjectMapEntity subject, string cnp)
    {
        var changed = false;

        if (subject.CnpEncrypted == null && _cnpProtector.IsConfigured)
        {
            try
            {
                subject.CnpEncrypted = _cnpProtector.Protect(cnp);
                changed = true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not encrypt the CNP for subject {SubjectId}", subject.SubjectId);
            }
        }

        var identity = CnpIdentity.Parse(cnp);

        if (subject.Sex == null && identity.Sex != null)
        {
            subject.Sex = identity.Sex;
            changed = true;
        }

        if (subject.BirthDate == null && identity.BirthDate != null)
        {
            subject.BirthDate = identity.BirthDate;
            changed = true;
        }

        if (subject.CnpLast4 == null && cnp.Length >= 4)
        {
            subject.CnpLast4 = cnp.Substring(cnp.Length - 4);
            changed = true;
        }

        return changed;
    }

    private static SubjectMapResult ToResult(SubjectMapEntity subject, bool isNew) => new()
    {
        SubjectId = subject.SubjectId,
        CnpHash = subject.CnpHash,
        CnpLast4 = subject.CnpLast4,
        CnpMasked = MaskCnp(subject.CnpLast4),
        Sex = subject.Sex,
        BirthDate = subject.BirthDate,
        HasStoredCnp = subject.CnpEncrypted != null,
        IsNew = isNew
    };

    public static string MaskCnp(string? cnpLast4)
    {
        if (string.IsNullOrEmpty(cnpLast4))
            return "******";

        return $"******{cnpLast4}";
    }

    private static string? Truncate(string? value, int max) =>
        value == null ? null : value.Length <= max ? value : value[..max];

    private byte[] ComputeCnpHash(string cnp, string pepper)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(pepper));
        return hmac.ComputeHash(Encoding.UTF8.GetBytes(cnp));
    }

    private string GenerateSubjectId(string cnp, string pepper)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(pepper));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(cnp));

        var base32 = ConvertToBase32(hash);
        var subjectId = $"MS-{base32.Substring(0, Math.Min(16, base32.Length))}";

        return subjectId;
    }

    private string ConvertToBase32(byte[] bytes)
    {
        const string base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var result = new StringBuilder();
        int bits = 0;
        int value = 0;

        foreach (byte b in bytes)
        {
            value = (value << 8) | b;
            bits += 8;

            while (bits >= 5)
            {
                result.Append(base32Chars[(value >> (bits - 5)) & 31]);
                bits -= 5;
            }
        }

        if (bits > 0)
        {
            result.Append(base32Chars[(value << (5 - bits)) & 31]);
        }

        return result.ToString();
    }

    private string GetPepper(string key)
    {
        var pepper = _configuration[key];
        if (string.IsNullOrEmpty(pepper))
        {
            pepper = _configuration["Subject:DefaultPepper"] ?? "MoneyShop_Default_Pepper_Change_In_Production_2024";
        }
        return pepper;
    }
}
