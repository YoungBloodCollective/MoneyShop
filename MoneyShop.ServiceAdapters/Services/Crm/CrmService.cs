using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using MoneyShop.DomainModel.Entities;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
using MoneyShop.DomainServices.RepositoryInterfaces.Kyc;
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
        private const string AnafType = "anaf_income";

        private readonly IApplicationRepository _applications;
        private readonly IKycFileRepository _kycFiles;
        private readonly MoneyShopDbContext _context;
        private readonly IConfiguration _configuration;

        public CrmService(
            IApplicationRepository applications,
            IKycFileRepository kycFiles,
            MoneyShopDbContext context,
            IConfiguration configuration)
        {
            _applications = applications;
            _kycFiles = kycFiles;
            _context = context;
            _configuration = configuration;
        }

        public List<CrmClientListItem> GetClients()
        {
            var apps = _applications.Get().ToList();
            var acords = _context.LoadAcordRows()
                .GroupBy(a => a.UserId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.CreatedAt).First());
            var appsByUser = apps.GroupBy(a => a.UserId).ToDictionary(g => g.Key, g => g.ToList());
            var userIds = appsByUser.Keys.Union(acords.Keys).ToList();
            var users = _context.Utilizatoris.Where(u => userIds.Contains(u.IdUtilizator))
                .ToDictionary(u => u.IdUtilizator);

            return userIds
                .Select(id =>
                {
                    users.TryGetValue(id, out var u);
                    acords.TryGetValue(id, out var acord);
                    appsByUser.TryGetValue(id, out var files);
                    files ??= new List<MoneyShop.DomainModel.Entities.Application>();
                    var latest = files.OrderByDescending(a => a.UpdatedAt).FirstOrDefault();
                    var activity = new List<DateTime>();
                    if (files.Count > 0) activity.Add(files.Max(a => a.UpdatedAt));
                    if (acord != null)
                    {
                        activity.Add(acord.UpdatedAt);
                        activity.Add(acord.CreatedAt);
                        if (acord.SignedAt != null) activity.Add(acord.SignedAt.Value);
                    }
                    return new CrmClientListItem
                    {
                        UserId = id,
                        FullName = FullName(u, acord, id),
                        Phone = u?.NumarTelefon ?? acord?.Telefon,
                        Email = u?.Mail ?? acord?.Email,
                        FilesCount = files.Count,
                        LastStatus = latest?.Status,
                        LastActivityAt = activity.Max(),
                        ApprovedVolume = files.Where(a => a.Status == "DISBURSAT").Sum(a => a.SumaAprobata ?? a.RequestedAmount ?? 0),
                        HasAcord = acord != null,
                        AcordId = acord?.AcordId,
                        AcordStatus = acord?.Status,
                        AcordSignedAt = acord?.SignedAt,
                        AcordCreatedAt = acord?.CreatedAt,
                    };
                })
                .OrderByDescending(c => c.LastActivityAt)
                .ToList();
        }

        public CrmClientDetail? GetClient(int userId)
        {
            var apps = _applications.Get().Where(a => a.UserId == userId).ToList();
            var acord = _context.AcordClients.Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt).FirstOrDefault();
            if (apps.Count == 0 && acord == null) return null;

            var user = _context.Utilizatoris.FirstOrDefault(u => u.IdUtilizator == userId);
            var appIds = apps.Select(a => a.Id).ToList();

            var docs = _context.Documents.Where(d => appIds.Contains(d.ApplicationId))
                .OrderByDescending(d => d.CreatedAt).ToList();

            var anaf = acord?.KycId == null ? null
                : _context.KycFiles
                    .Where(f => f.KycId == acord.KycId.Value && f.FileType == AnafType && f.DeletedAt == null)
                    .OrderByDescending(f => f.CreatedAt)
                    .FirstOrDefault();

            var latest = apps.OrderByDescending(a => a.UpdatedAt).FirstOrDefault();

            return new CrmClientDetail
            {
                UserId = userId,
                FullName = FullName(user, acord, userId),
                Phone = user?.NumarTelefon ?? acord?.Telefon,
                Email = user?.Mail ?? acord?.Email,
                AcordId = acord?.AcordId,
                AcordStatus = acord?.Status,
                AcordSignedAt = acord?.SignedAt,
                AcordCreatedAt = acord?.CreatedAt,
                BirthDate = user?.DataNastere,
                PhoneVerified = user?.PhoneVerified ?? false,
                EmailVerified = user?.EmailVerified ?? false,
                Financial = latest == null ? null : new CrmFinancialSnapshot
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
                CanAttachAnaf = acord?.KycId != null,
                AnafFileName = anaf?.FileName,
                AnafUploadedAt = anaf?.CreatedAt,
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

        private AcordClient? FindAcord(int userId) =>
            _context.AcordClients.Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt).FirstOrDefault();

        public CrmAnafFile? GetClientAnaf(int userId)
        {
            var acord = FindAcord(userId);
            if (acord?.KycId == null) return null;

            var file = _context.KycFiles
                .Where(f => f.KycId == acord.KycId.Value && f.FileType == AnafType && f.DeletedAt == null)
                .OrderByDescending(f => f.CreatedAt)
                .FirstOrDefault();

            if (file?.FileContentBase64 == null) return null;

            return new CrmAnafFile
            {
                Content = Convert.FromBase64String(file.FileContentBase64),
                FileName = file.FileName,
                MimeType = file.MimeType,
            };
        }

        public CrmAnafUploadResult UploadClientAnaf(int userId, byte[] content, string fileName, string mimeType)
        {
            var acord = FindAcord(userId);
            if (acord?.KycId == null) return new CrmAnafUploadResult { Ok = false, Reason = "no_acord" };

            byte[] hash;
            using (var sha = SHA256.Create()) hash = sha.ComputeHash(content);

            var retentionDays = _configuration.GetValue<int?>("Acord:RetentionDays") ?? 30;
            var expires = DateTime.UtcNow.AddDays(retentionDays);

            var existing = _context.KycFiles
                .FirstOrDefault(f => f.KycId == acord.KycId.Value && f.FileType == AnafType && f.DeletedAt == null);

            if (existing != null)
            {
                existing.FileName = fileName;
                existing.MimeType = mimeType;
                existing.FileSize = content.LongLength;
                existing.Sha256Hash = hash;
                existing.FileContentBase64 = Convert.ToBase64String(content);
                existing.CreatedAt = DateTime.UtcNow;
                existing.ExpiresAt = expires;
                _kycFiles.Update(existing);
            }
            else
            {
                _kycFiles.Insert(new KycFile
                {
                    FileId = Guid.NewGuid(),
                    KycId = acord.KycId.Value,
                    FileType = AnafType,
                    FileName = fileName,
                    MimeType = mimeType,
                    FileSize = content.LongLength,
                    Sha256Hash = hash,
                    FileContentBase64 = Convert.ToBase64String(content),
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = expires,
                });
            }

            _context.SaveChanges();
            return new CrmAnafUploadResult { Ok = true };
        }

        private static string FullName(Utilizatori? user, AcordClient? acord, int userId) =>
            FullName(user, acord?.Prenume, acord?.Nume, userId);

        private static string FullName(Utilizatori? user, CrmAcordRow? acord, int userId) =>
            FullName(user, acord?.Prenume, acord?.Nume, userId);

        private static string FullName(Utilizatori? user, string? acordPrenume, string? acordNume, int userId)
        {
            var full = $"{user?.Prenume} {user?.Nume}".Trim();
            if (string.IsNullOrWhiteSpace(full)) full = $"{acordPrenume} {acordNume}".Trim();
            return string.IsNullOrWhiteSpace(full) ? $"Client #{userId}" : full;
        }

        private static string FullName(string? nume, string? prenume, int userId)
        {
            var full = $"{prenume} {nume}".Trim();
            return string.IsNullOrWhiteSpace(full) ? $"Client #{userId}" : full;
        }
    }
}
