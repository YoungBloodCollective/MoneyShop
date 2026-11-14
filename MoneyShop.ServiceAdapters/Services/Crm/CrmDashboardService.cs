using System;
using System.Collections.Generic;
using System.Linq;
using MoneyShop.DomainServices.RepositoryInterfaces.Application;
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
        private const string INREGISTRAT = "INREGISTRAT";
        private const string IN_ANALIZA = "IN_ANALIZA";
        private const string NEVOIE_DOCUMENTE = "NEVOIE_DOCUMENTE";
        private const string PREAPROBAT = "PREAPROBAT";
        private const string TRIMIS_LA_BANCA = "TRIMIS_LA_BANCA";
        private const string APROBAT_BANCA = "APROBAT_BANCA";
        private const string DISBURSAT = "DISBURSAT";
        private const string RESPINS = "RESPINS";

        private static readonly string[] Closed = { DISBURSAT, RESPINS };

        private readonly IApplicationRepository _applications;
        private readonly MoneyShopDbContext _context;

        public CrmDashboardService(IApplicationRepository applications, MoneyShopDbContext context)
        {
            _applications = applications;
            _context = context;
        }

        public CrmDashboardSummary GetSummary()
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1);
            var prevMonthStart = monthStart.AddMonths(-1);

            var apps = _applications.Get().ToList();
            var acords = _context.AcordClients.ToList();
            var appIds = apps.Select(a => a.Id).ToList();

            var firstSeen = apps.Select(a => (a.UserId, At: a.CreatedAt))
                .Concat(acords.Select(a => (a.UserId, At: a.CreatedAt)))
                .GroupBy(x => x.UserId)
                .Select(g => g.Min(x => x.At))
                .ToList();
            var newThisMonth = firstSeen.Count(d => d >= monthStart);
            var newLastMonth = firstSeen.Count(d => d >= prevMonthStart && d < monthStart);

            var approvedThisMonth = _context.ApplicationStatusHistories
                .Count(h => appIds.Contains(h.ApplicationId) && h.ToStatus == APROBAT_BANCA && h.ChangedAt >= monthStart);

            var activeUsers = apps.Where(a => a.Status != RESPINS).Select(a => a.UserId)
                .Union(acords.Where(a => a.Status != "rejected").Select(a => a.UserId))
                .Distinct()
                .Count();

            var summary = new CrmDashboardSummary
            {
                ActiveClients = activeUsers,
                ActiveClientsDeltaPct = newLastMonth > 0 ? (int)Math.Round((newThisMonth - newLastMonth) * 100.0 / newLastMonth) : 0,
                FilesInProgress = apps.Count(a => !Closed.Contains(a.Status)),
                ApprovedThisMonth = approvedThisMonth,
                CreditVolume = apps.Where(a => a.Status == DISBURSAT).Sum(a => a.SumaAprobata ?? a.RequestedAmount ?? 0),
            };

            summary.StatusBreakdown = new List<CrmStatusSlice>
            {
                new() { Key = "analiza", Label = "În analiză", Count = apps.Count(a => StatusGroup(a.Status) == "analiza") },
                new() { Key = "banca", Label = "La bancă", Count = apps.Count(a => a.Status == TRIMIS_LA_BANCA) },
                new() { Key = "aprobate", Label = "Aprobate", Count = apps.Count(a => a.Status == APROBAT_BANCA) },
                new() { Key = "debursate", Label = "Debursate", Count = apps.Count(a => a.Status == DISBURSAT) },
                new() { Key = "respins", Label = "Respinse", Count = apps.Count(a => a.Status == RESPINS) },
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
                    Title = $"Dosar #MS-{a.Id} — {StatusLabel(a.Status)}",
                    At = a.UpdatedAt,
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

            var userIds = apps.Select(a => a.UserId).Distinct().ToList();
            var birthdays = _context.SubjectMaps
                .Where(s => userIds.Contains(s.UserId) && s.BirthDate != null
                         && s.BirthDate.Value.Month == now.Month && s.BirthDate.Value.Day == now.Day)
                .Count();

            var withFile = apps.Select(a => a.UserId).ToHashSet();
            var signedWithoutFile = acords
                .Where(a => (a.Status == "signed" || a.Status == "completed") && !withFile.Contains(a.UserId))
                .Select(a => a.UserId)
                .Distinct()
                .Count();

            summary.Tasks = new List<CrmTask>
            {
                new() { Label = "Documente lipsă", Count = apps.Count(a => a.Status == NEVOIE_DOCUMENTE), Severity = "danger" },
                new() { Label = "Urmărire aprobare", Count = apps.Count(a => a.Status == TRIMIS_LA_BANCA), Severity = "warning" },
                new() { Label = "Acorduri semnate fără dosar", Count = signedWithoutFile, Severity = "info" },
                new() { Label = "Zile de naștere (astăzi)", Count = birthdays, Severity = "info" },
            };

            return summary;
        }

        private static string StatusGroup(string status) => status switch
        {
            TRIMIS_LA_BANCA => "banca",
            APROBAT_BANCA => "aprobate",
            DISBURSAT => "debursate",
            RESPINS => "respins",
            _ => "analiza",
        };

        private static string StatusLabel(string status) => status switch
        {
            INREGISTRAT => "Înregistrat",
            IN_ANALIZA => "În analiză",
            NEVOIE_DOCUMENTE => "Nevoie de documente",
            PREAPROBAT => "Pre-aprobat",
            "OFERTA_TRANSMISA" => "Ofertă transmisă",
            "ACCEPTAT_CLIENT" => "Acceptat de client",
            TRIMIS_LA_BANCA => "Trimis la bancă",
            APROBAT_BANCA => "Aprobat de bancă",
            DISBURSAT => "Debursat",
            RESPINS => "Respins",
            _ => status,
        };
    }
}
