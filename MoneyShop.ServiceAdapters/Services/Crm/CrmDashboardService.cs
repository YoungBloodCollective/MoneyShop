using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Reads the broker's loan files through the standard scope (the repository carries the
    /// broker filter) and folds them into the few numbers the dashboard shows. Nothing here is
    /// stored; every call recomputes from the current records.
    /// </summary>
    public class CrmDashboardService : ICrmDashboardService
    {
        private const string DISBURSAT = BankFileStatuses.Disbursat;
        private const string RESPINS = BankFileStatuses.Respins;
        private const string ACORD_SIGNED = "signed";
        private const string ACORD_COMPLETED = "completed";
        private const string ACORD_REJECTED = "rejected";

        private static readonly string[] InWork = { BankFileStatuses.Trimis, BankFileStatuses.Verificari, BankFileStatuses.Analiza, BankFileStatuses.Completari };
        private static readonly string[] Approved = { BankFileStatuses.AprobatFinanciar, BankFileStatuses.AprobatFinal };

        private readonly MoneyShopDbContext _context;

        public CrmDashboardService(MoneyShopDbContext context)
        {
            _context = context;
        }

        public CrmDashboardSummary GetSummary()
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1);
            var prevMonthStart = monthStart.AddMonths(-1);

            var apps = _context.BankFiles.AsNoTracking().ToList();
            var acords = _context.LoadAcordRows();

            var firstSeen = apps.Select(a => (a.UserId, At: a.CreatedAt))
                .Concat(acords.Select(a => (a.UserId, At: a.CreatedAt)))
                .GroupBy(x => x.UserId)
                .Select(g => g.Min(x => x.At))
                .ToList();
            var newThisMonth = firstSeen.Count(d => d >= monthStart);
            var lastMonthCutoff = prevMonthStart.AddDays(now.Day);
            if (lastMonthCutoff > monthStart) lastMonthCutoff = monthStart;
            var newLastMonth = firstSeen.Count(d => d >= prevMonthStart && d < lastMonthCutoff);

            var approvedThisMonth = apps.Count(a => (Approved.Contains(a.Status) || a.Status == DISBURSAT) && a.StatusChangedAt >= monthStart);

            var activeUsers = apps.Where(a => a.Status != RESPINS).Select(a => a.UserId)
                .Union(acords.Where(a => a.Status != ACORD_REJECTED).Select(a => a.UserId))
                .Distinct()
                .Count();

            var summary = new CrmDashboardSummary
            {
                ActiveClients = activeUsers,
                ActiveClientsDeltaPct = newLastMonth > 0 ? (int)Math.Round((newThisMonth - newLastMonth) * 100.0 / newLastMonth) : 0,
                FilesInProgress = apps.Count(a => InWork.Contains(a.Status)),
                ApprovedThisMonth = approvedThisMonth,
                CreditVolume = apps.Where(a => a.Status == DISBURSAT).Sum(a => a.Amount),
            };

            summary.StatusBreakdown = new List<CrmStatusSlice>
            {
                new() { Key = "lucru", Label = "În lucru", Count = apps.Count(a => InWork.Contains(a.Status)) },
                new() { Key = "aprobate", Label = "Aprobate", Count = apps.Count(a => Approved.Contains(a.Status)) },
                new() { Key = "disbursate", Label = "Disbursate", Count = apps.Count(a => a.Status == DISBURSAT) },
                new() { Key = "respinse", Label = "Respinse", Count = apps.Count(a => a.Status == RESPINS) },
            };

            var byDay = firstSeen.Where(d => d >= now.Date.AddDays(-29))
                .GroupBy(d => d.Date)
                .ToDictionary(g => g.Key, g => g.Count());
            summary.Evolution = Enumerable.Range(0, 30)
                .Select(i => now.Date.AddDays(-29 + i))
                .Select(d => new CrmDayCount { Date = d, Count = byDay.TryGetValue(d, out var c) ? c : 0 })
                .ToList();

            var activities = apps
                .Select(a => new CrmActivity
                {
                    Title = $"Dosar #D-{a.Id} — {a.BankName}, {StatusLabel(a.Status)}",
                    At = a.StatusChangedAt,
                    Kind = "dosar",
                })
                .Concat(acords.Select(a =>
                {
                    var name = $"{a.Prenume} {a.Nume}".Trim();
                    return a.SignedAt != null
                        ? new CrmActivity { Title = $"Acord semnat de {name}", At = a.SignedAt.Value, Kind = "acord" }
                        : new CrmActivity { Title = $"Acord început de {name}", At = a.CreatedAt, Kind = "acord" };
                }))
                .OrderByDescending(a => a.At)
                .Take(6)
                .ToList();
            summary.RecentActivities = activities;

            var userIds = apps.Select(a => a.UserId).Union(acords.Select(a => a.UserId)).Distinct().ToList();
            var birthdays = _context.SubjectMaps
                .Where(s => userIds.Contains(s.UserId) && s.BirthDate != null
                         && s.BirthDate.Value.Month == now.Month && s.BirthDate.Value.Day == now.Day)
                .Count();

            var withFile = apps.Select(a => a.UserId).ToHashSet();
            var signedWithoutFile = acords
                .Where(a => (a.Status == ACORD_SIGNED || a.Status == ACORD_COMPLETED) && !withFile.Contains(a.UserId))
                .Select(a => a.UserId)
                .Distinct()
                .Count();

            summary.Tasks = new List<CrmTask>
            {
                new() { Label = "Documente lipsă", Count = apps.Count(a => a.Status == BankFileStatuses.Completari), Severity = "danger", Kind = "documents" },
                new() { Label = "Urmărire aprobare", Count = apps.Count(a => InWork.Contains(a.Status) && a.Status != BankFileStatuses.Completari), Severity = "warning", Kind = "approval" },
                new() { Label = "Acorduri semnate fără dosar", Count = signedWithoutFile, Severity = "info", Kind = "acord" },
                new() { Label = "Zile de naștere (astăzi)", Count = birthdays, Severity = "info", Kind = "birthday" },
            };

            return summary;
        }

        private static string StatusLabel(string status) => status switch
        {
            BankFileStatuses.Trimis => "Trimis",
            BankFileStatuses.Verificari => "Verificări",
            BankFileStatuses.Analiza => "Analiză",
            BankFileStatuses.Completari => "Completări",
            BankFileStatuses.AprobatFinanciar => "Aprobat financiar",
            BankFileStatuses.AprobatFinal => "Aprobat final",
            DISBURSAT => "Disbursat",
            RESPINS => "Respins",
            _ => status,
        };
    }
}
