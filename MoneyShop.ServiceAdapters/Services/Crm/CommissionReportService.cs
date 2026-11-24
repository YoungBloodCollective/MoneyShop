using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    public class CommissionReportService : ICommissionReportService
    {
        private readonly MoneyShopDbContext _context;
        private readonly ICommissionCalculator _calculator;
        private readonly TimeZoneInfo _zone;

        public CommissionReportService(MoneyShopDbContext context, ICommissionCalculator calculator)
        {
            _context = context;
            _calculator = calculator;
            _zone = RomaniaTime.Zone;
        }

        public CommissionReport Build(int userId, bool isAdmin, string? month, int? brokerId)
        {
            var (label, fromUtc, toUtc) = MonthRange(month);
            var ownId = ResolveOwnProfileId(userId);
            int targetId;
            if (!isAdmin)
            {
                if (ownId == null) throw new InvalidOperationException("Raportul de comisioane este disponibil doar brokerilor cu profil propriu.");
                if (brokerId != null && brokerId != ownId) throw new UnauthorizedAccessException("Poți descărca doar raportul tău.");
                targetId = ownId.Value;
            }
            else
            {
                targetId = brokerId ?? ownId ?? throw new InvalidOperationException("Alege brokerul pentru care generezi raportul.");
            }

            var broker = _context.BrokerProfiles.AsNoTracking().FirstOrDefault(p => p.Id == targetId)
                ?? throw new InvalidOperationException("Brokerul nu există.");
            var files = _context.BankFiles.AsNoTracking()
                .Where(f => f.BrokerProfileId == targetId && f.Status == BankFileStatuses.Disbursat
                            && f.StatusChangedAt >= fromUtc && f.StatusChangedAt < toUtc)
                .ToList();
            var userIds = files.Select(f => f.UserId).Distinct().ToList();
            var users = _context.Utilizatoris.Where(u => userIds.Contains(u.IdUtilizator)).ToDictionary(u => u.IdUtilizator);
            var acords = _context.AcordClients.AsNoTracking().Where(a => userIds.Contains(a.UserId)).ToList()
                .GroupBy(a => a.UserId).ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.CreatedAt).First());
            var bankNames = _context.Banks.AsNoTracking().ToDictionary(b => b.Id, b => b.Name.Trim());
            var commission = _calculator.ForMonth(label);

            var rows = files.Select(f =>
            {
                users.TryGetValue(f.UserId, out var u);
                acords.TryGetValue(f.UserId, out var a);
                var bankId = f.BankId ?? 0;
                var bankName = f.BankId != null && bankNames.TryGetValue(f.BankId.Value, out var n) ? n : (f.BankName ?? string.Empty).Trim();
                var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(f.StatusChangedAt, DateTimeKind.Utc), _zone);
                return (Id: f.Id, Row: new CommissionReportRow
                {
                    Date = local.Date,
                    ClientName = CrmService.FullName(u, a?.Prenume, a?.Nume, f.UserId),
                    BankName = string.IsNullOrWhiteSpace(bankName) ? "—" : bankName,
                    CreditType = CreditTypes.IsValid(f.CreditType) ? f.CreditType : null,
                    Amount = f.Amount,
                    Percent = commission.RateFor(targetId, bankId, f.CreditType).Percent,
                    Commission = commission.Commission(targetId, bankId, f.CreditType, f.Amount),
                });
            }).ToList();

            var banks = rows.GroupBy(r => r.Row.BankName)
                .OrderBy(g => g.Key, StringComparer.Create(new CultureInfo("ro-RO"), true))
                .Select(g =>
                {
                    var ordered = g.OrderBy(r => r.Row.Date).ThenBy(r => r.Id).Select(r => r.Row).ToList();
                    return new CommissionReportBank
                    {
                        BankName = g.Key,
                        Rows = ordered,
                        Count = ordered.Count,
                        Amount = ordered.Sum(r => r.Amount),
                        Commission = ordered.Sum(r => r.Commission),
                    };
                }).ToList();

            return new CommissionReport
            {
                Month = label,
                BrokerProfileId = broker.Id,
                BrokerName = broker.DisplayName,
                BrokerSlug = broker.Slug,
                FirmName = string.IsNullOrWhiteSpace(broker.FirmaNume) ? null : broker.FirmaNume.Trim(),
                Banks = banks,
                Count = banks.Sum(b => b.Count),
                TotalAmount = banks.Sum(b => b.Amount),
                TotalCommission = banks.Sum(b => b.Commission),
            };
        }

        public CommissionReportFile Generate(int userId, bool isAdmin, string? month, int? brokerId, string format)
        {
            var kind = (format ?? string.Empty).Trim().ToLowerInvariant();
            if (kind != "pdf" && kind != "xlsx") throw new InvalidOperationException("Formatul trebuie să fie pdf sau xlsx.");
            var report = Build(userId, isAdmin, month, brokerId);
            var slug = Regex.Replace(report.BrokerSlug.ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
            if (slug.Length == 0) slug = "broker";
            return new CommissionReportFile
            {
                Content = kind == "pdf" ? CommissionReportPdf.Build(report) : CommissionReportXlsx.Build(report),
                ContentType = kind == "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                FileName = $"raport-comisioane-{report.Month}-{slug}.{kind}",
            };
        }

        private int? ResolveOwnProfileId(int userId)
        {
            if (_context.BrokerScopeId is > 0) return _context.BrokerScopeId;
            return _context.BrokerProfiles.AsNoTracking().Where(p => p.UserId == userId && p.Status == "Active")
                .Select(p => (int?)p.Id).FirstOrDefault();
        }

        private (string Label, DateTime FromUtc, DateTime ToUtc) MonthRange(string? month)
        {
            int year, mon;
            if (string.IsNullOrWhiteSpace(month))
            {
                var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _zone);
                year = now.Year;
                mon = now.Month;
            }
            else if (!DateTime.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                throw new InvalidOperationException("Luna trebuie să fie în formatul AAAA-LL.");
            }
            else
            {
                year = parsed.Year;
                mon = parsed.Month;
                if (year < 2000 || year > 2100) throw new InvalidOperationException("Luna trebuie să fie între anii 2000 și 2100.");
            }
            var start = new DateTime(year, mon, 1, 0, 0, 0, DateTimeKind.Unspecified);
            return ($"{year:D4}-{mon:D2}", TimeZoneInfo.ConvertTimeToUtc(start, _zone), TimeZoneInfo.ConvertTimeToUtc(start.AddMonths(1), _zone));
        }
    }
}
