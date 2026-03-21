using System.Text.Json;
using Microsoft.AspNetCore.Http;
using MoneyShop.DomainModel.Entities;
using MoneyShop.DomainServices.RepositoryInterfaces.Eligibility;
using MoneyShop.DomainServices.RepositoryInterfaces.User;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Dtos.BcReport;
using MoneyShop.ServiceInterface.Interfaces.BcReport;
using MoneyShop.ServiceInterface.Interfaces.User;

namespace MoneyShop.ServiceAdapters.Services.BcReport;

public class BcReportService : IBcReportService
{
    private readonly IBcReportRepository _bcReportRepository;
    private readonly IBcReportParserService _parserService;
    private readonly IUserFinancialDataRepository _userFinancialDataRepository;
    private readonly MoneyShopDbContext _context;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public BcReportService(
        IBcReportRepository bcReportRepository,
        IBcReportParserService parserService,
        IUserFinancialDataRepository userFinancialDataRepository,
        MoneyShopDbContext context)
    {
        _bcReportRepository = bcReportRepository;
        _parserService = parserService;
        _userFinancialDataRepository = userFinancialDataRepository;
        _context = context;
    }

    public async Task<BcReportUploadResult> UploadAndParseAsync(IFormFile file, int userId)
    {
        // Read file bytes
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var pdfBytes = ms.ToArray();
        var base64 = Convert.ToBase64String(pdfBytes);

        // Parse the PDF
        var parseResult = _parserService.ParsePdf(pdfBytes);
        var data = parseResult.Data;

        // Calculate DPD counts from accounts
        // DaysOverdue is populated from detailed account parsing; if that section was missing,
        // fall back to counting accounts with arrears as DPD30
        int dpd30 = data.Accounts.Count(a => a.DaysOverdue >= 30 && a.DaysOverdue < 60);
        int dpd60 = data.Accounts.Count(a => a.DaysOverdue >= 60 && a.DaysOverdue < 90);
        int dpd90Plus = data.Accounts.Count(a => a.DaysOverdue >= 90);
        if (dpd30 == 0 && dpd60 == 0 && dpd90Plus == 0)
            dpd30 = data.Accounts.Count(a => a.HasArrears && a.DaysOverdue == 0);

        // Calculate monthly obligations
        decimal monthlyObligations = (data.BankingIndicators?.TotalMonthlyPayment ?? 0)
                                   + (data.NonBankingIndicators?.TotalMonthlyPayment ?? 0);

        // Serialize parsed data
        var parsedDataJson = JsonSerializer.Serialize(data, JsonOptions);
        var warningsJson = JsonSerializer.Serialize(parseResult.Warnings, JsonOptions);

        // Upsert BcReport
        var existing = _bcReportRepository.Get()
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefault(r => r.UserId == userId);

        if (existing != null)
        {
            existing.ReportId = Guid.NewGuid().ToString("N");
            existing.FileContentBase64 = base64;
            existing.FileName = file.FileName;
            existing.FicoScore = data.FicoScore;
            existing.ExistingMonthlyObligations = monthlyObligations;
            existing.Dpd30Count = dpd30;
            existing.Dpd60Count = dpd60;
            existing.Dpd90PlusCount = dpd90Plus;
            existing.NonbankClosedLast4Years = data.NonBankingIndicators?.ClosedLast24Months;
            existing.NonbankActiveNow = (data.NonBankingIndicators?.TotalAccounts ?? 0) - (data.NonBankingIndicators?.ClosedLast24Months ?? 0);
            existing.ParsedDataJson = parsedDataJson;
            existing.ParseWarnings = warningsJson;
            existing.ParserVersion = "1.0";
            existing.ParsedAt = DateTime.UtcNow;
            _bcReportRepository.Update(existing);
        }
        else
        {
            existing = new DomainModel.Entities.BcReport
            {
                UserId = userId,
                ReportId = Guid.NewGuid().ToString("N"),
                FileContentBase64 = base64,
                FileName = file.FileName,
                FicoScore = data.FicoScore,
                ExistingMonthlyObligations = monthlyObligations,
                Dpd30Count = dpd30,
                Dpd60Count = dpd60,
                Dpd90PlusCount = dpd90Plus,
                NonbankClosedLast4Years = data.NonBankingIndicators?.ClosedLast24Months,
                NonbankActiveNow = (data.NonBankingIndicators?.TotalAccounts ?? 0) - (data.NonBankingIndicators?.ClosedLast24Months ?? 0),
                ParsedDataJson = parsedDataJson,
                ParseWarnings = warningsJson,
                ParserVersion = "1.0",
                CreatedAt = DateTime.UtcNow,
                ParsedAt = DateTime.UtcNow
            };
            _bcReportRepository.Insert(existing);
        }

        _context.SaveChanges();

        AutoPopulateCredits(userId, data);

        return new BcReportUploadResult
        {
            ReportId = existing.Id,
            FicoScore = data.FicoScore,
            TotalAccounts = data.Accounts.Count,
            ActiveAccounts = data.Accounts.Count(a => a.IsActive),
            AccountsWithArrears = data.Accounts.Count(a => a.HasArrears),
            TotalMonthlyObligations = monthlyObligations,
            TotalAmountOwed = (data.BankingIndicators?.TotalAmountOwed ?? 0) + (data.NonBankingIndicators?.TotalAmountOwed ?? 0),
            TotalArrears = (data.BankingIndicators?.TotalArrears ?? 0) + (data.NonBankingIndicators?.TotalArrears ?? 0),
            ParseWarnings = parseResult.Warnings,
            ParsedData = data
        };
    }

    public BcReportSummaryDto? GetLatest(int userId)
    {
        var report = _bcReportRepository.Get()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new DomainModel.Entities.BcReport
            {
                Id = r.Id,
                UserId = r.UserId,
                ReportId = r.ReportId,
                FileName = r.FileName,
                FicoScore = r.FicoScore,
                ExistingMonthlyObligations = r.ExistingMonthlyObligations,
                Dpd30Count = r.Dpd30Count,
                Dpd60Count = r.Dpd60Count,
                Dpd90PlusCount = r.Dpd90PlusCount,
                NonbankClosedLast4Years = r.NonbankClosedLast4Years,
                NonbankActiveNow = r.NonbankActiveNow,
                ParsedDataJson = r.ParsedDataJson,
                ParseWarnings = r.ParseWarnings,
                ParserVersion = r.ParserVersion,
                CreatedAt = r.CreatedAt,
                ParsedAt = r.ParsedAt
            })
            .FirstOrDefault();

        return report == null ? null : MapToDto(report);
    }

    public BcReportSummaryDto? GetById(int reportId)
    {
        var report = _bcReportRepository.Get()
            .Where(r => r.Id == reportId)
            .Select(r => new DomainModel.Entities.BcReport
            {
                Id = r.Id,
                UserId = r.UserId,
                ReportId = r.ReportId,
                FileName = r.FileName,
                FicoScore = r.FicoScore,
                ExistingMonthlyObligations = r.ExistingMonthlyObligations,
                Dpd30Count = r.Dpd30Count,
                Dpd60Count = r.Dpd60Count,
                Dpd90PlusCount = r.Dpd90PlusCount,
                NonbankClosedLast4Years = r.NonbankClosedLast4Years,
                NonbankActiveNow = r.NonbankActiveNow,
                ParsedDataJson = r.ParsedDataJson,
                ParseWarnings = r.ParseWarnings,
                ParserVersion = r.ParserVersion,
                CreatedAt = r.CreatedAt,
                ParsedAt = r.ParsedAt
            })
            .FirstOrDefault();

        return report == null ? null : MapToDto(report);
    }

    private void AutoPopulateCredits(int userId, BcParsedData data)
    {
        var activeAccounts = data.Accounts
            .Where(a => !string.IsNullOrEmpty(a.Creditor) && a.CurrentBalance > 0)
            .ToList();
        var creditEntries = activeAccounts.Select(a => new CreditEntryDto
        {
            Name = $"{a.AccountType} - {a.Creditor}",
            RemainingAmount = a.CurrentBalance,
            MonthlyPayment = 0,
            MonthsLeft = 0
        }).ToList();
        string creditsJson = JsonSerializer.Serialize(creditEntries, JsonOptions);
        decimal soldTotal = activeAccounts.Sum(a => a.CurrentBalance);
        decimal rataTotalaLunara = (data.BankingIndicators?.TotalMonthlyPayment ?? 0)
                                 + (data.NonBankingIndicators?.TotalMonthlyPayment ?? 0);
        int nrCredite = activeAccounts.Count;
        var accountsWithArrears = data.Accounts
            .Where(a => !string.IsNullOrEmpty(a.Creditor) && a.ArrearsAmount > 0)
            .ToList();
        bool hasArrears = accountsWithArrears.Count > 0;
        int arrearsCount = accountsWithArrears.Count;
        var existing = _userFinancialDataRepository.Get()
            .FirstOrDefault(f => f.UserId == userId);
        if (existing != null)
        {
            existing.FicoScore = data.FicoScore;
            existing.CreditsJson = creditsJson;
            existing.SoldTotal = soldTotal;
            existing.RataTotalaLunara = rataTotalaLunara;
            existing.NrCrediteBanci = nrCredite;
            existing.Intarzieri = hasArrears;
            existing.IntarzieriNumar = arrearsCount;
            if (existing.VenitTotal.HasValue && existing.VenitTotal.Value > 0)
            {
                existing.Dti = rataTotalaLunara / existing.VenitTotal.Value;
                existing.ScoringLevel = existing.Dti switch
                {
                    <= 0.30m => "foarte_mare",
                    <= 0.40m => "mare",
                    <= 0.50m => "bun",
                    <= 0.55m => "conditii_speciale",
                    _ => "foarte_scazut"
                };
            }
            existing.LastUpdated = DateTime.UtcNow;
            _userFinancialDataRepository.Update(existing);
        }
        else
        {
            existing = new UserFinancialData
            {
                UserId = userId,
                FicoScore = data.FicoScore,
                CreditsJson = creditsJson,
                SoldTotal = soldTotal,
                RataTotalaLunara = rataTotalaLunara,
                NrCrediteBanci = nrCredite,
                Intarzieri = hasArrears,
                IntarzieriNumar = arrearsCount,
                CreatedAt = DateTime.UtcNow,
                LastUpdated = DateTime.UtcNow
            };
            _userFinancialDataRepository.Insert(existing);
        }
        _context.SaveChanges();
    }

    private static BcReportSummaryDto MapToDto(DomainModel.Entities.BcReport report)
    {
        BcParsedData? parsedData = null;
        if (!string.IsNullOrEmpty(report.ParsedDataJson))
        {
            try { parsedData = JsonSerializer.Deserialize<BcParsedData>(report.ParsedDataJson, JsonOptions); }
            catch { /* ignore deserialization errors */ }
        }

        List<string> warnings = new();
        if (!string.IsNullOrEmpty(report.ParseWarnings))
        {
            try { warnings = JsonSerializer.Deserialize<List<string>>(report.ParseWarnings, JsonOptions) ?? new(); }
            catch { /* ignore */ }
        }

        return new BcReportSummaryDto
        {
            Id = report.Id,
            FicoScore = report.FicoScore,
            ExistingMonthlyObligations = report.ExistingMonthlyObligations,
            Dpd30Count = report.Dpd30Count,
            Dpd60Count = report.Dpd60Count,
            Dpd90PlusCount = report.Dpd90PlusCount,
            NonbankClosedLast4Years = report.NonbankClosedLast4Years,
            NonbankActiveNow = report.NonbankActiveNow,
            FileName = report.FileName,
            CreatedAt = report.CreatedAt,
            ParsedAt = report.ParsedAt,
            ParsedData = parsedData,
            ParseWarnings = warnings
        };
    }
}
