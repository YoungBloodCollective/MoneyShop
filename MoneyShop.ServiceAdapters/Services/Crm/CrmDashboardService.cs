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

        private static readonly string[] InAnaliza = { INREGISTRAT, IN_ANALIZA, NEVOIE_DOCUMENTE, PREAPROBAT };
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

            var clientsThisMonth = apps.Where(a => a.CreatedAt >= monthStart).Select(a => a.UserId).Distinct().Count();
            var clientsBefore = apps.Where(a => a.CreatedAt < monthStart).Select(a => a.UserId).Distinct().Count();

            var summary = new CrmDashboardSummary
            {
                ActiveClients = apps.Where(a => a.Status != RESPINS).Select(a => a.UserId).Distinct().Count(),
                ActiveClientsDeltaPct = clientsBefore > 0 ? (int)Math.Round(clientsThisMonth * 100.0 / clientsBefore) : 0,
                FilesInProgress = apps.Count(a => !Closed.Contains(a.Status)),
                ApprovedThisMonth = apps.Count(a => a.Status == APROBAT_BANCA && a.UpdatedAt >= monthStart),
                CreditVolume = apps.Where(a => a.Status == DISBURSAT).Sum(a => a.SumaAprobata ?? a.RequestedAmount ?? 0),
            };

            summary.StatusBreakdown = new List<CrmStatusSlice>
            {
                new() { Key = "analiza", Label = "In analiza", Count = apps.Count(a => InAnaliza.Contains(a.Status)) },
                new() { Key = "banca", Label = "La banca", Count = apps.Count(a => a.Status == TRIMIS_LA_BANCA) },
                new() { Key = "aprobate", Label = "Aprobate", Count = apps.Count(a => a.Status == APROBAT_BANCA) },
                new() { Key = "debursate", Label = "Debursate", Count = apps.Count(a => a.Status == DISBURSAT) },
            };

            var byDay = apps.Where(a => a.CreatedAt >= now.Date.AddDays(-29))
                .GroupBy(a => a.CreatedAt.Date)
                .ToDictionary(g => g.Key, g => g.Count());
            summary.Evolution = Enumerable.Range(0, 30)
                .Select(i => now.Date.AddDays(-29 + i))
                .Select(d => new CrmDayCount { Date = d, Count = byDay.TryGetValue(d, out var c) ? c : 0 })
                .ToList();

            summary.RecentActivities = apps
                .OrderByDescending(a => a.UpdatedAt)
                .Take(6)
                .Select(a => new CrmActivity
                {
                    Title = $"Dosar #MS-{a.Id} — {StatusLabel(a.Status)}",
                    At = a.UpdatedAt,
                    Kind = "dosar",
                })
                .ToList();

            var userIds = apps.Select(a => a.UserId).Distinct().ToList();
            var birthdays = _context.SubjectMaps
                .Where(s => userIds.Contains(s.UserId) && s.BirthDate != null
                         && s.BirthDate.Value.Month == now.Month && s.BirthDate.Value.Day == now.Day)
                .Count();

            summary.Tasks = new List<CrmTask>
            {
                new() { Label = "Documente lipsa", Count = apps.Count(a => a.Status == NEVOIE_DOCUMENTE), Severity = "danger" },
                new() { Label = "Urmarire aprobare", Count = apps.Count(a => a.Status == TRIMIS_LA_BANCA), Severity = "warning" },
                new() { Label = "Zile de nastere (astazi)", Count = birthdays, Severity = "info" },
            };

            return summary;
        }

        private static string StatusLabel(string status) => status switch
        {
            INREGISTRAT => "Inregistrat",
            IN_ANALIZA => "In analiza",
            NEVOIE_DOCUMENTE => "Nevoie documente",
            PREAPROBAT => "Pre-aprobat",
            TRIMIS_LA_BANCA => "Trimis la banca",
            APROBAT_BANCA => "Aprobat de banca",
            DISBURSAT => "Disbursat",
            RESPINS => "Respins",
            _ => status,
        };
    }
}
