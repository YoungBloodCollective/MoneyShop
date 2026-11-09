using System;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Acord;
using MoneyShop.ServiceInterface.Interfaces.Kyc;
using MoneyShop.ServiceInterface.Interfaces.Retention;

namespace MoneyShop.ServiceAdapters.Services.Retention;

public class RetentionSweeper : IRetentionSweeper
{
    private const int RevokedSessionDays = 30;
    private static readonly string[] TerminalKycStatuses = { "verified", "rejected", "expired" };
    private static readonly string[] TerminalAcordStatuses = { "completed", "rejected" };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly MoneyShopDbContext _context;
    private readonly DbContextOptions<MoneyShopDbContext> _options;
    private readonly IKycService _kycService;
    private readonly IAcordService _acordService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RetentionSweeper> _logger;

    public RetentionSweeper(
        MoneyShopDbContext context,
        DbContextOptions<MoneyShopDbContext> options,
        IKycService kycService,
        IAcordService acordService,
        IConfiguration configuration,
        ILogger<RetentionSweeper> logger)
    {
        _context = context;
        _options = options;
        _kycService = kycService;
        _acordService = acordService;
        _configuration = configuration;
        _logger = logger;
    }

    private int Days(string key, int fallback) =>
        Math.Max(0, _configuration.GetValue<int?>($"Retention:{key}") ?? fallback);

    public async Task<RetentionSweepResult> SweepAsync(CancellationToken cancellationToken = default)
    {
        _context.Database.SetCommandTimeout(600);
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        var lockResult = new SqlParameter("@result", SqlDbType.Int) { Direction = ParameterDirection.Output };
        await _context.Database.ExecuteSqlRawAsync(
            "EXEC @result = sp_getapplock @Resource = 'MoneyShop.Retention', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0",
            new object[] { lockResult },
            cancellationToken);

        if (lockResult.Value is int code && code < 0)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            _logger.LogInformation("Data retention: another instance is sweeping, skipping this run");
            return new RetentionSweepResult { Skipped = true, Status = "skipped" };
        }

        await using var runContext = new MoneyShopDbContext(_options);
        var run = new RetentionRun { StartedAt = DateTime.UtcNow, Status = "running" };
        runContext.RetentionRuns.Add(run);
        await runContext.SaveChangesAsync(cancellationToken);

        var result = new RetentionSweepResult { RunId = run.Id };

        try
        {
            result.Summary = await RunSweepAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            run.Status = "succeeded";
            run.SummaryJson = JsonSerializer.Serialize(result.Summary, JsonOptions);
            _logger.LogInformation(
                "Data retention run {RunId}: kycFilesErased={KycFilesErased} kycSessionsMasked={KycSessionsMasked} acordsPurged={AcordsPurged} otpDeleted={OtpDeleted} sessionsDeleted={SessionsDeleted} leadSessionsDeleted={LeadSessionsDeleted} bcReportsErased={BcReportsErased}",
                run.Id,
                result.Summary.KycFilesErased,
                result.Summary.KycSessionsMasked,
                result.Summary.AcordsPurged,
                result.Summary.OtpDeleted,
                result.Summary.SessionsDeleted,
                result.Summary.LeadSessionsDeleted,
                result.Summary.BcReportsErased);
        }
        catch (Exception ex)
        {
            try { await transaction.RollbackAsync(CancellationToken.None); } catch { }
            _logger.LogError(ex, "Data retention run {RunId} failed", run.Id);
            var message = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message;
            run.Status = "failed";
            run.Error = message;
            result.Status = "failed";
            result.Error = message;
            result.Summary = new RetentionSweepSummary();
        }

        run.FinishedAt = DateTime.UtcNow;
        await runContext.SaveChangesAsync(CancellationToken.None);
        return result;
    }

    private async Task<RetentionSweepSummary> RunSweepAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var summary = new RetentionSweepSummary();

        summary.KycFilesErased = _kycService.MarkExpiredFilesForDeletion();

        var kycDays = Days("KycSessionPiiDays", 30);
        if (kycDays > 0)
        {
            var cutoff = now.AddDays(-kycDays);
            summary.KycSessionsMasked = await _context.KycSessions
                .Where(k => TerminalKycStatuses.Contains(k.Status)
                            && (k.VerifiedAt ?? k.CreatedAt) < cutoff
                            && (k.Address != null || k.City != null || k.PostalCode != null || k.Token != null
                                || (k.Cnp != null && (k.Cnp.Length == 44
                                    || (k.Cnp.Length == 13 && !EF.Functions.Like(k.Cnp, "%[^0-9]%"))))))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(k => k.Address, (string?)null)
                    .SetProperty(k => k.City, (string?)null)
                    .SetProperty(k => k.PostalCode, (string?)null)
                    .SetProperty(k => k.Token, (string?)null)
                    .SetProperty(k => k.Cnp, k =>
                        k.Cnp != null && k.Cnp.Length == 13 && !EF.Functions.Like(k.Cnp, "%[^0-9]%")
                            ? "*********" + k.Cnp.Substring(9, 4)
                            : (k.Cnp != null && k.Cnp.Length == 44 ? (string?)null : k.Cnp)), ct);
        }

        var acordDays = Days("AcordClientPiiDays", 0);
        if (acordDays > 0)
        {
            var cutoff = now.AddDays(-acordDays);
            var unset = default(DateTime);
            summary.AcordsPurged += await _context.AcordClients
                .IgnoreQueryFilters()
                .Where(a => a.ExpiresAt > unset && a.ExpiresAt <= cutoff
                            && TerminalAcordStatuses.Contains(a.Status)
                            && (a.OcrDataJson != null || a.StareCivila != null || a.StareLocativa != null
                                || a.FunctieActuala != null || a.Studii != null || a.NumeFirma != null
                                || a.VechimeTotalaAni != null || a.VechimeLocActualAni != null || a.TipAct != null))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(a => a.OcrDataJson, (string?)null)
                    .SetProperty(a => a.StareCivila, (string?)null)
                    .SetProperty(a => a.StareLocativa, (string?)null)
                    .SetProperty(a => a.FunctieActuala, (string?)null)
                    .SetProperty(a => a.Studii, (string?)null)
                    .SetProperty(a => a.NumeFirma, (string?)null)
                    .SetProperty(a => a.VechimeTotalaAni, (decimal?)null)
                    .SetProperty(a => a.VechimeLocActualAni, (decimal?)null)
                    .SetProperty(a => a.TipAct, (string?)null), ct);
        }

        summary.AcordsPurged += _acordService.PurgeExpiredOcrData();

        var otpDays = Days("OtpChallengeDays", 30);
        if (otpDays > 0)
        {
            var cutoff = now.AddDays(-otpDays);
            summary.OtpDeleted = await _context.OtpChallenges
                .Where(o => o.CreatedAt < cutoff)
                .ExecuteDeleteAsync(ct);
        }

        var sessionDays = Days("SessionDays", 90);
        if (sessionDays > 0)
        {
            var cutoff = now.AddDays(-sessionDays);
            var revokedCutoff = now.AddDays(-RevokedSessionDays);
            summary.SessionsDeleted = await _context.Sessions
                .Where(s => s.CreatedAt < cutoff || (s.RevokedAt != null && s.RevokedAt < revokedCutoff))
                .ExecuteDeleteAsync(ct);
        }

        var leadDays = Days("LeadSessionGraceDays", 7);
        if (leadDays > 0)
        {
            var cutoff = now.AddDays(-leadDays);
            summary.LeadSessionsDeleted = await _context.LeadSessions
                .Where(l => l.ExpiresAt != null && l.ExpiresAt < cutoff)
                .ExecuteDeleteAsync(ct);
        }

        var bcDays = Days("BcReportDays", 365);
        if (bcDays > 0)
        {
            var cutoff = now.AddDays(-bcDays);
            summary.BcReportsErased = await _context.BcReports
                .Where(b => b.FileContentBase64 != null && b.CreatedAt < cutoff)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.FileContentBase64, (string?)null), ct);
        }

        return summary;
    }
}
