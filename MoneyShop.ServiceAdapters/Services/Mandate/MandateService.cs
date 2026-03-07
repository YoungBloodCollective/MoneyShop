using System;
using System.Linq;
using MoneyShop.DomainModel.Entities;
using MoneyShop.ServiceInterface.Interfaces.Mandate;
using MoneyShop.DomainServices.RepositoryInterfaces.Mandate;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MandateEntity = MoneyShop.DomainModel.Entities.Mandate;

namespace MoneyShop.ServiceAdapters.Services.Mandate;

public class MandateService : IMandateService
{
    private readonly IMandateRepository _mandateRepository;
    private readonly MoneyShopDbContext _context;

    public MandateService(
        IMandateRepository mandateRepository,
        MoneyShopDbContext context)
    {
        _mandateRepository = mandateRepository;
        _context = context;
    }

    public MandateCreateResult CreateMandate(
        int userId,
        string mandateType,
        string? consentEventId,
        int expiresInDays = 30)
    {
        // Check if user already has an active mandate of this type
        var existingMandate = _mandateRepository.Get()
            .FirstOrDefault(m => m.UserId == userId &&
                                m.MandateType == mandateType &&
                                m.Status == "active" &&
                                m.ExpiresAt > DateTime.UtcNow);

        if (existingMandate != null)
        {
            // Return existing mandate
            return new MandateCreateResult
            {
                MandateId = existingMandate.MandateId,
                Status = existingMandate.Status,
                GrantedAt = existingMandate.GrantedAt,
                ExpiresAt = existingMandate.ExpiresAt
            };
        }

        // Create new mandate
        var mandate = new MandateEntity
        {
            MandateId = Guid.NewGuid(),
            UserId = userId,
            MandateType = mandateType,
            Scope = "credit_eligibility_only",
            Status = "active",
            GrantedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(expiresInDays),
            ConsentEventId = consentEventId
        };

        _mandateRepository.Insert(mandate);
        _context.SaveChanges();

        return new MandateCreateResult
        {
            MandateId = mandate.MandateId,
            Status = mandate.Status,
            GrantedAt = mandate.GrantedAt,
            ExpiresAt = mandate.ExpiresAt
        };
    }

    public MandateInfo? GetMandate(Guid mandateId, int userId)
    {
        var mandate = _mandateRepository.Get()
            .FirstOrDefault(m => m.MandateId == mandateId && m.UserId == userId);

        if (mandate == null)
            return null;

        // Check if expired
        if (mandate.Status == "active" && mandate.ExpiresAt < DateTime.UtcNow)
        {
            mandate.Status = "expired";
            _mandateRepository.Update(mandate);
            _context.SaveChanges();
        }

        return new MandateInfo
        {
            MandateId = mandate.MandateId,
            MandateType = mandate.MandateType,
            Status = mandate.Status,
            GrantedAt = mandate.GrantedAt,
            ExpiresAt = mandate.ExpiresAt,
            RevokedAt = mandate.RevokedAt
        };
    }

    public List<MandateInfo> GetUserMandates(int userId)
    {
        return _mandateRepository.Get()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.GrantedAt)
            .Select(m => new MandateInfo
            {
                MandateId = m.MandateId,
                MandateType = m.MandateType,
                Status = m.Status,
                GrantedAt = m.GrantedAt,
                ExpiresAt = m.ExpiresAt,
                RevokedAt = m.RevokedAt
            })
            .ToList();
    }

    public bool RevokeMandate(Guid mandateId, int userId, string? reason = null)
    {
        var mandate = _mandateRepository.Get()
            .FirstOrDefault(m => m.MandateId == mandateId && m.UserId == userId);

        if (mandate == null || mandate.Status != "active")
        {
            return false;
        }

        mandate.Status = "revoked";
        mandate.RevokedAt = DateTime.UtcNow;
        mandate.RevokedReason = reason;
        _mandateRepository.Update(mandate);
        _context.SaveChanges();

        return true;
    }

    public bool HasActiveMandate(int userId, string mandateType)
    {
        return _mandateRepository.Get()
            .Any(m => m.UserId == userId &&
                     m.MandateType == mandateType &&
                     m.Status == "active" &&
                     m.ExpiresAt > DateTime.UtcNow);
    }
}
