using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Dtos.BcReport;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using MoneyShop.ServiceInterface.Interfaces.BcReport;
using MoneyShop.ServiceInterface.Interfaces.Subject;

namespace MoneyShop.Tests.Crm;

internal class FakeAcordService : IAcordService
{
    private readonly MoneyShopDbContext _db;
    public FakeAcordService(MoneyShopDbContext db) => _db = db;

    public AcordDetails? GetDetailsForAdmin(Guid acordId)
    {
        var a = _db.AcordClients.FirstOrDefault(x => x.AcordId == acordId);
        if (a == null) return null;
        var files = a.KycId == null
            ? new List<AcordFileInfo>()
            : _db.KycFiles.Where(f => f.KycId == a.KycId.Value).ToList().Select(f => new AcordFileInfo
            {
                FileId = f.FileId,
                FileType = f.FileType,
                FileName = f.FileName,
                MimeType = f.MimeType,
                FileSize = f.FileSize,
                CreatedAt = f.CreatedAt,
                ExpiresAt = f.ExpiresAt,
                IsDeleted = f.DeletedAt != null,
            }).ToList();
        return new AcordDetails
        {
            AcordId = a.AcordId,
            UserId = a.UserId,
            Nume = a.Nume,
            Prenume = a.Prenume,
            Telefon = a.Telefon,
            Status = a.Status,
            CreatedAt = a.CreatedAt,
            SignedAt = a.SignedAt,
            CnpMasked = "180******3456",
            CnpAvailable = true,
            Files = files,
        };
    }

    public Task<AcordSubmitResult> SubmitAsync(AcordSubmitInput input, AcordSignContext context) => throw new NotImplementedException();
    public Task ProcessSubmissionAsync(Guid acordId) => throw new NotImplementedException();
    public AcordConsentText GetConsentText(string? brokerSlug = null) => throw new NotImplementedException();
    public AcordFileContent? GetBankDocumentTemplate(string bankCode, string documentCode) => throw new NotImplementedException();
    public AcordFileContent? GetBrokerForm(string bankCode, string documentCode) => throw new NotImplementedException();
    public int PurgeExpiredOcrData() => throw new NotImplementedException();
    public List<AcordListItem> ListForAdmin(string? status, string? search, int? brokerId = null) => throw new NotImplementedException();
    public AcordFileContent? GetFileForAdmin(Guid fileId, CnpAccessContext? access = null) => throw new NotImplementedException();
    public bool UpdateStatusForAdmin(Guid acordId, string status, string? reviewNote) => throw new NotImplementedException();
    public string? RevealCnpForAdmin(Guid acordId, CnpAccessContext access) => throw new NotImplementedException();
}

internal class FakeBankConsentService : IBankConsentService
{
    private readonly MoneyShopDbContext _db;
    public FakeBankConsentService(MoneyShopDbContext db) => _db = db;

    public List<BankConsentInfo> ListForAcord(Guid acordId) =>
        _db.BankConsentRequests.Where(r => r.AcordId == acordId).ToList().Select(r => new BankConsentInfo
        {
            Id = r.Id,
            BankCode = r.BankCode,
            BankName = r.BankCode,
            Status = r.Status,
            CreatedAt = r.CreatedAt,
            ExpiresAt = r.ExpiresAt,
            SignedAt = r.SignedAt,
            FileId = r.FileId,
        }).ToList();

    public List<BankConsentBank> ListBanks() => throw new NotImplementedException();
    public BankConsentCreateResult CreateForAcord(Guid acordId, string bankCode, int? createdByUserId) => throw new NotImplementedException();
    public BankConsentPublicView? GetByToken(string token) => throw new NotImplementedException();
    public BankConsentDocumentFile? GetDocumentByToken(string token, string documentCode) => throw new NotImplementedException();
    public BankConsentDocumentFile? GenerateCodebitorForm(Guid acordId, string? relation, int? actorUserId, string? actorRole = null, string? ip = null, string? userAgent = null) => throw new NotImplementedException();
    public BankConsentSignResult Sign(string token, byte[] signaturePng, BankConsentSignInput input, string? ip, string? userAgent) => throw new NotImplementedException();
}

internal class FakeBcReportService : IBcReportService
{
    private readonly MoneyShopDbContext _db;
    public const string LeakyCnp = "1800101123456";
    public FakeBcReportService(MoneyShopDbContext db) => _db = db;

    public BcReportSummaryDto? GetLatest(int userId)
    {
        var r = _db.BcReports.Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt).FirstOrDefault();
        if (r == null) return null;
        var parsed = JsonSerializer.Deserialize<BcParsedData>(r.ParsedDataJson!)!;
        parsed.SubjectCnp = LeakyCnp;
        return new BcReportSummaryDto
        {
            Id = r.Id,
            FicoScore = r.FicoScore,
            ExistingMonthlyObligations = r.ExistingMonthlyObligations,
            Dpd30Count = r.Dpd30Count,
            FileName = r.FileName,
            CreatedAt = r.CreatedAt,
            ParsedData = parsed,
        };
    }

    public Task<BcReportUploadResult> UploadAndParseAsync(IFormFile file, int userId) => throw new NotImplementedException();
    public BcReportSummaryDto? GetById(int reportId, int userId) => throw new NotImplementedException();
}

internal class FakeSubjectService : ISubjectService
{
    public List<(int UserId, CnpAccessContext Access)> Logged { get; } = new();

    public bool LogCnpAccess(int userId, CnpAccessContext access)
    {
        Logged.Add((userId, access));
        return true;
    }

    public SubjectMapResult GetOrCreateSubject(int userId, string cnp, bool allowExistingOtherUser = false) => throw new NotImplementedException();
    public SubjectMapResult? GetSubjectByUserId(int userId) => throw new NotImplementedException();
    public SubjectMapResult? GetSubjectById(string subjectId) => throw new NotImplementedException();
    public string? RevealCnpByUserId(int userId, CnpAccessContext access) => throw new NotImplementedException();
}
