using System;
using System.Collections.Generic;
using System.Linq;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Backs the CRM client and offer lists. The application repository is the scoped source of
    /// truth (it carries the broker filter); every related table is bound to that scope through
    /// the broker's own application ids and user ids, never queried broker-wide.
    /// </summary>
    public class CrmService : ICrmService
    {
        private static readonly string[] ClosedStatuses = { "DISBURSAT", "RESPINS" };

        private readonly IApplicationRepository _applications;
        private readonly MoneyShopDbContext _context;

        public CrmService(IApplicationRepository applications, MoneyShopDbContext context)
        {
            _applications = applications;
            _context = context;
        }

        public List<CrmClientListItem> GetClients()
        {
            var apps = _applications.Get().ToList();
            var userIds = apps.Select(a => a.UserId).Distinct().ToList();
            var users = _context.Utilizatoris.Where(u => userIds.Contains(u.IdUtilizator))
                .ToDictionary(u => u.IdUtilizator);

            return apps
                .GroupBy(a => a.UserId)
                .Select(g =>
                {
                    var latest = g.OrderByDescending(a => a.UpdatedAt).First();
                    users.TryGetValue(g.Key, out var u);
                    return new CrmClientListItem
                    {
                        UserId = g.Key,
                        FullName = FullName(u?.Nume, u?.Prenume, g.Key),
                        Phone = u?.NumarTelefon,
                        Email = u?.Mail,
                        FilesCount = g.Count(),
                        LastStatus = latest.Status,
                        LastActivityAt = g.Max(a => a.UpdatedAt),
                        ApprovedVolume = g.Where(a => a.Status == "DISBURSAT").Sum(a => a.SumaAprobata ?? a.RequestedAmount ?? 0),
                    };
                })
                .OrderByDescending(c => c.LastActivityAt)
                .ToList();
        }

        public CrmClientDetail? GetClient(int userId)
        {
            var apps = _applications.Get().Where(a => a.UserId == userId).ToList();
            if (apps.Count == 0) return null;

            var user = _context.Utilizatoris.FirstOrDefault(u => u.IdUtilizator == userId);
            var appIds = apps.Select(a => a.Id).ToList();

            var docs = _context.Documents.Where(d => appIds.Contains(d.ApplicationId))
                .OrderByDescending(d => d.CreatedAt).ToList();

            var acord = _context.AcordClients.Where(a => a.UserId == userId)
                .OrderByDescending(a => a.AcordId).FirstOrDefault();

            var latest = apps.OrderByDescending(a => a.UpdatedAt).First();

            return new CrmClientDetail
            {
                UserId = userId,
                FullName = FullName(user?.Nume, user?.Prenume, userId),
                Phone = user?.NumarTelefon,
                Email = user?.Mail,
                BirthDate = user?.DataNastere,
                PhoneVerified = user?.PhoneVerified ?? false,
                EmailVerified = user?.EmailVerified ?? false,
                Financial = new CrmFinancialSnapshot
                {
                    SalariuNet = latest.SalariuNet,
                    VechimeLuni = latest.VechimeLuni,
                    NrCrediteBanci = latest.NrCrediteBanci,
                    SoldTotal = latest.SoldTotal,
                    Dti = latest.Dti,
                    Scoring = latest.Scoring,
                    RecommendedLevel = latest.RecommendedLevel,
                },
                Files = apps.OrderByDescending(a => a.UpdatedAt).Select(a => new CrmClientFile
                {
                    Id = a.Id,
                    Code = $"MS-{a.Id}",
                    Status = a.Status,
                    TypeCredit = a.TypeCredit,
                    RequestedAmount = a.RequestedAmount,
                    RequestedTermMonths = a.RequestedTermMonths,
                    SumaAprobata = a.SumaAprobata,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt,
                }).ToList(),
                Documents = docs.Select(d => new CrmClientDocument
                {
                    Id = d.Id,
                    DocType = d.DocType,
                    FileName = d.FileName,
                    FileSize = d.FileSize,
                    CreatedAt = d.CreatedAt,
                }).ToList(),
                Kyc = acord == null ? null : new CrmKycSnapshot
                {
                    Status = acord.Status,
                    HasIdFront = acord.HasIdFront,
                    HasIdBack = acord.HasIdBack,
                    HasSelfie = acord.HasSelfie,
                    HasProofOfAddress = acord.HasProofOfAddress,
                    LivenessPassed = acord.LivenessPassed,
                    FaceMatchPassed = acord.FaceMatchPassed,
                },
            };
        }

        public List<CrmOfferItem> GetOffers()
        {
            var apps = _applications.Get().ToList();
            var appIds = apps.Select(a => a.Id).ToList();
            var userIds = apps.Select(a => a.UserId).Distinct().ToList();

            var users = _context.Utilizatoris.Where(u => userIds.Contains(u.IdUtilizator))
                .ToDictionary(u => u.IdUtilizator);
            var appById = apps.ToDictionary(a => a.Id);

            var offers = _context.ApplicationBanks.Where(ab => appIds.Contains(ab.ApplicationId)).ToList();
            var bankIds = offers.Select(o => o.BankId).Distinct().ToList();
            var banks = _context.Banks.Where(b => bankIds.Contains(b.Id)).ToDictionary(b => b.Id);

            return offers
                .Select(o =>
                {
                    appById.TryGetValue(o.ApplicationId, out var app);
                    banks.TryGetValue(o.BankId, out var bank);
                    users.TryGetValue(app?.UserId ?? 0, out var u);
                    return new CrmOfferItem
                    {
                        ApplicationId = o.ApplicationId,
                        FileCode = $"MS-{o.ApplicationId}",
                        ClientName = FullName(u?.Nume, u?.Prenume, app?.UserId ?? 0),
                        BankName = bank?.Name ?? "—",
                        CommissionPercent = o.CommissionPercent,
                        RequestedAmount = app?.RequestedAmount,
                        Status = app?.Status ?? "—",
                        CreatedAt = app?.CreatedAt ?? DateTime.UtcNow,
                    };
                })
                .OrderByDescending(o => o.CreatedAt)
                .ToList();
        }

        public List<CrmFileListItem> GetFiles()
        {
            var apps = _applications.Get().ToList();
            var userIds = apps.Select(a => a.UserId).Distinct().ToList();
            var users = _context.Utilizatoris.Where(u => userIds.Contains(u.IdUtilizator))
                .ToDictionary(u => u.IdUtilizator);

            return apps
                .OrderByDescending(a => a.UpdatedAt)
                .Select(a =>
                {
                    users.TryGetValue(a.UserId, out var u);
                    return new CrmFileListItem
                    {
                        Id = a.Id,
                        Code = $"MS-{a.Id}",
                        UserId = a.UserId,
                        ClientName = FullName(u?.Nume, u?.Prenume, a.UserId),
                        Status = a.Status,
                        TypeCredit = a.TypeCredit,
                        RequestedAmount = a.RequestedAmount,
                        SumaAprobata = a.SumaAprobata,
                        CreatedAt = a.CreatedAt,
                        UpdatedAt = a.UpdatedAt,
                    };
                })
                .ToList();
        }

        private static string FullName(string? nume, string? prenume, int userId)
        {
            var full = $"{prenume} {nume}".Trim();
            return string.IsNullOrWhiteSpace(full) ? $"Client #{userId}" : full;
        }
    }
}
