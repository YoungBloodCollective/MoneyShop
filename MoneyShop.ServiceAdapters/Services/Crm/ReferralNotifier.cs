using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// When the receiving broker adds a bank file or moves it to another stage, the referring broker of an
    /// accepted collaboration gets an email. The match is exact: the referral's receiver owns the file, and
    /// the file's client is the client the referral's lead became. Everything needed is read here and queued;
    /// a background worker sends it. Nothing here may fail or slow the update.
    /// </summary>
    public class ReferralNotifier : IReferralNotifier
    {
        private static readonly (string Key, string Label)[] StatusLabels =
        {
            (BankFileStatuses.Trimis, "Trimis"),
            (BankFileStatuses.Verificari, "Verificări"),
            (BankFileStatuses.Analiza, "Analiză"),
            (BankFileStatuses.Completari, "Completări"),
            (BankFileStatuses.AprobatFinanciar, "Aprobat financiar"),
            (BankFileStatuses.AprobatFinal, "Aprobat final"),
            (BankFileStatuses.Disbursat, "Disbursat"),
            (BankFileStatuses.Respins, "Respins"),
        };

        private readonly MoneyShopDbContext _context;
        private readonly ReferralStatusQueue _queue;
        private readonly ILogger<ReferralNotifier> _logger;

        public ReferralNotifier(MoneyShopDbContext context, ReferralStatusQueue queue, ILogger<ReferralNotifier> logger)
        {
            _context = context;
            _queue = queue;
            _logger = logger;
        }

        public void BankFileChanged(int bankFileId)
        {
            try
            {
                var file = _context.BankFiles.IgnoreQueryFilters().AsNoTracking()
                    .Where(f => f.Id == bankFileId && f.BrokerProfileId != null)
                    .Select(f => new { f.UserId, f.BrokerProfileId, f.BankName, f.Status })
                    .FirstOrDefault();
                if (file == null) return;

                var match = (from r in _context.ClientReferrals.AsNoTracking()
                             join l in _context.LeadCaptures.IgnoreQueryFilters().AsNoTracking() on r.LeadId equals l.Id
                             where r.ToBrokerProfileId == file.BrokerProfileId
                                   && r.Mode == ReferralModes.Colaborare
                                   && r.Status == ReferralStatuses.Acceptat
                                   && l.UserId == file.UserId
                                   && l.BrokerProfileId == r.ToBrokerProfileId
                             select new { r.FromBrokerProfileId, l.NumePrenume }).FirstOrDefault();
                if (match == null) return;

                var email = _context.BrokerProfiles.AsNoTracking()
                    .Where(p => p.Id == match.FromBrokerProfileId)
                    .Select(p => p.NotificationEmail ?? p.PublicEmail ?? p.User.Mail)
                    .FirstOrDefault();
                if (string.IsNullOrWhiteSpace(email)) return;

                var label = StatusLabels.FirstOrDefault(s => s.Key == file.Status).Label ?? file.Status;
                if (!_queue.TryEnqueue(new ReferralStatusEmail(email, match.NumePrenume, file.BankName, label)))
                    _logger.LogWarning("Referral status email for bank file {BankFileId} was not queued", bankFileId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Referral status email for bank file {BankFileId} failed", bankFileId);
            }
        }
    }
}
