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

namespace MoneyShop.ServiceAdapters.Services.Subject;

public class SubjectService : ISubjectService
{
    private readonly ISubjectMapRepository _subjectMapRepository;
    private readonly MoneyShopDbContext _context;
    private readonly IConfiguration _configuration;
    private const string PEPPER1_KEY = "Subject:Pepper1";
    private const string PEPPER2_KEY = "Subject:Pepper2";

    public SubjectService(
        ISubjectMapRepository subjectMapRepository,
        MoneyShopDbContext context,
        IConfiguration configuration)
    {
        _subjectMapRepository = subjectMapRepository;
        _context = context;
        _configuration = configuration;
    }

    /// <summary>
    /// Creates or gets a subject_id for a user based on CNP
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

        var existingSubject = _subjectMapRepository.Get()
            .FirstOrDefault(s => s.CnpHash.SequenceEqual(cnpHash));

        if (existingSubject != null)
        {
            return new SubjectMapResult
            {
                SubjectId = existingSubject.SubjectId,
                CnpHash = existingSubject.CnpHash,
                CnpLast4 = existingSubject.CnpLast4,
                CnpMasked = MaskCnp(existingSubject.CnpLast4),
                IsNew = false
            };
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

        _subjectMapRepository.Insert(subject);
        _context.SaveChanges();

        return new SubjectMapResult
        {
            SubjectId = subject.SubjectId,
            CnpHash = subject.CnpHash,
            CnpLast4 = subject.CnpLast4,
            CnpMasked = MaskCnp(subject.CnpLast4),
            IsNew = true
        };
    }

    /// <summary>
    /// Gets subject by user ID
    /// </summary>
    public SubjectMapResult? GetSubjectByUserId(int userId)
    {
        var subject = _subjectMapRepository.Get()
            .FirstOrDefault(s => s.UserId == userId);

        if (subject == null)
            return null;

        return new SubjectMapResult
        {
            SubjectId = subject.SubjectId,
            CnpHash = subject.CnpHash,
            CnpLast4 = subject.CnpLast4,
            CnpMasked = MaskCnp(subject.CnpLast4),
            IsNew = false
        };
    }

    /// <summary>
    /// Gets subject by subject_id
    /// </summary>
    public SubjectMapResult? GetSubjectById(string subjectId)
    {
        var subject = _subjectMapRepository.Get()
            .FirstOrDefault(s => s.SubjectId == subjectId);

        if (subject == null)
            return null;

        return new SubjectMapResult
        {
            SubjectId = subject.SubjectId,
            CnpHash = subject.CnpHash,
            CnpLast4 = subject.CnpLast4,
            CnpMasked = MaskCnp(subject.CnpLast4),
            IsNew = false
        };
    }

    public static string MaskCnp(string? cnpLast4)
    {
        if (string.IsNullOrEmpty(cnpLast4))
            return "******";

        return $"******{cnpLast4}";
    }

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
