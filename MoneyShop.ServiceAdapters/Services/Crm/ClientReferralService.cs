using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Broker;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Colaborare / Transfer. A referral belongs to two brokers, so nothing here relies on the broker
    /// query filter alone: each read names the caller's side. The cross-broker reads are few and narrow:
    /// the receiver's bank files and lead of one accepted collaboration (to the referrer, as stage rows
    /// without notes or documents), the referrer's own acord names (to the referrer), and the contact data
    /// of the referred client, read only when the client answers yes on the private link.
    /// </summary>
    public class ClientReferralService : IClientReferralService
    {
        public const int MaxNote = 500;
        public const int ConsentValidDays = 7;
        private const int DirectoryLimit = 30;
        private const int OverviewLimit = 500;
        public const int MaxPerClientPerDay = 3;

        private static readonly Regex TokenPattern = new(@"^[A-Za-z0-9_-]{20,64}$", RegexOptions.Compiled);

        private readonly MoneyShopDbContext _context;
        private readonly ICommissionCalculator _commission;
        private readonly IReferralMessenger _messenger;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ClientReferralService> _logger;
        private readonly TimeProvider _time;

        public ClientReferralService(
            MoneyShopDbContext context,
            ICommissionCalculator commission,
            IReferralMessenger messenger,
            IConfiguration configuration,
            ILogger<ClientReferralService> logger,
            TimeProvider? time = null)
        {
            _context = context;
            _commission = commission;
            _messenger = messenger;
            _configuration = configuration;
            _logger = logger;
            _time = time ?? TimeProvider.System;
        }

        private DateTime Now => _time.GetUtcNow().UtcDateTime;

        public List<BrokerDirectoryItem> SearchBrokers(string? q, string? oras, string? judet)
        {
            var name = q?.Trim().ToLowerInvariant() ?? "";
            var city = oras?.Trim().ToLowerInvariant() ?? "";
            var county = RomanianCounties.Canonical(judet) ?? "";
            if (name.Length < 2 && city.Length < 2 && county.Length == 0) return new List<BrokerDirectoryItem>();

            var caller = _context.BrokerScopeId;
            var query = _context.BrokerProfiles.AsNoTracking().Where(p => p.Status == "Active");
            if (caller is > 0) query = query.Where(p => p.Id != caller);
            if (name.Length >= 2)
                query = query.Where(p => p.DisplayName.ToLower().Contains(name) || (p.Oras != null && p.Oras.ToLower().Contains(name)));
            if (city.Length >= 2) query = query.Where(p => p.Oras != null && p.Oras.ToLower().Contains(city));
            if (county.Length > 0) query = query.Where(p => p.Judet == county);

            return query.OrderBy(p => p.DisplayName).Take(DirectoryLimit)
                .Select(p => new BrokerDirectoryItem { Id = p.Id, DisplayName = p.DisplayName, Oras = p.Oras, Judet = p.Judet, Type = p.Type })
                .ToList();
        }

        public async Task<ReferralCreateResult> CreateAsync(int clientUserId, ReferralCreateInput input)
        {
            if (_context.BrokerScopeId is not > 0) return Fail(ReferralError.NotBroker);
            var from = _context.BrokerScopeId.Value;

            var mode = string.IsNullOrWhiteSpace(input.Mode) ? ReferralModes.Colaborare : input.Mode.Trim();
            if (!ReferralModes.IsValid(mode)) return Fail(ReferralError.InvalidMode);
            var note = string.IsNullOrWhiteSpace(input.Note) ? null : input.Note.Trim();
            if (note is { Length: > MaxNote }) return Fail(ReferralError.NoteTooLong);

            if (input.ToBrokerProfileId is not > 0) return Fail(ReferralError.TargetNotFound);
            var to = input.ToBrokerProfileId.Value;
            if (to == from) return Fail(ReferralError.SelfReferral);
            var target = _context.BrokerProfiles.AsNoTracking()
                .Where(p => p.Id == to && p.Status == "Active")
                .Select(p => new { p.Id, p.DisplayName, p.Oras })
                .FirstOrDefault();
            if (target == null) return Fail(ReferralError.TargetNotFound);

            var visible = _context.AcordClients.Any(a => a.UserId == clientUserId)
                          || _context.Applications.Any(a => a.UserId == clientUserId);
            if (!visible) return Fail(ReferralError.ClientNotVisible);

            var contact = ReadContact(clientUserId, from);
            if (contact == null) return Fail(ReferralError.NoContact);
            if (string.IsNullOrWhiteSpace(contact.Phone)) return Fail(ReferralError.NoPhone);

            var now = Now;
            var since = now.AddHours(-24);
            var recent = _context.ClientReferrals.IgnoreQueryFilters().Count(r => r.ClientUserId == clientUserId && r.CreatedAt > since);
            if (recent >= MaxPerClientPerDay) return Fail(ReferralError.TooManyForClient);
            var duplicate = _context.ClientReferrals.Any(r => r.FromBrokerProfileId == from && r.ToBrokerProfileId == to && r.ClientUserId == clientUserId
                && (r.Status == ReferralStatuses.Acceptat || (r.Status == ReferralStatuses.AsteaptaClient && r.ConsentExpiresAt > now)));
            if (duplicate) return Fail(ReferralError.Duplicate);

            var token = BrokerInviteService.NewToken();
            var referral = new ClientReferral
            {
                FromBrokerProfileId = from,
                ToBrokerProfileId = to,
                ClientUserId = clientUserId,
                Mode = mode,
                SharePercent = mode == ReferralModes.Colaborare ? ReferralModes.ColaborareSharePercent : 0,
                Note = note,
                Status = ReferralStatuses.AsteaptaClient,
                ConsentTokenHash = BrokerInviteService.HashToken(token),
                ConsentExpiresAt = now.AddDays(ConsentValidDays),
                CreatedAt = now,
                UpdatedAt = now,
            };
            _context.ClientReferrals.Add(referral);
            await _context.SaveChangesAsync();

            var fromName = _context.BrokerProfiles.AsNoTracking().Where(p => p.Id == from).Select(p => p.DisplayName).FirstOrDefault() ?? "Brokerul tău";
            ReferralDelivery delivery;
            try
            {
                delivery = await _messenger.SendConsentRequestAsync(new ReferralConsentMessage
                {
                    Phone = contact.Phone,
                    Email = contact.Email,
                    ClientFirstName = contact.FirstName,
                    FromName = fromName,
                    ToName = target.DisplayName,
                    ToOras = target.Oras,
                    Collaboration = mode == ReferralModes.Colaborare,
                    Url = $"https://{Root()}/colaborare#t={Uri.EscapeDataString(token)}",
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Consent request for referral {ReferralId} could not be sent", referral.Id);
                delivery = new ReferralDelivery();
            }

            return new ReferralCreateResult
            {
                Referral = new ReferralItem
                {
                    Id = referral.Id,
                    FromBrokerProfileId = from,
                    FromBrokerName = fromName,
                    ToBrokerProfileId = to,
                    ToBrokerName = target.DisplayName,
                    ToBrokerOras = target.Oras,
                    ClientUserId = clientUserId,
                    ClientName = contact.FullName,
                    Mode = mode,
                    SharePercent = referral.SharePercent,
                    Note = note,
                    Status = referral.Status,
                    CreatedAt = referral.CreatedAt,
                    ConsentExpiresAt = referral.ConsentExpiresAt,
                    CanCancel = true,
                },
                SmsSent = delivery.Sms,
                EmailSent = delivery.Email,
            };
        }

        public ReferralOverview GetOverview()
        {
            var scope = _context.BrokerScopeId;
            var query = _context.ClientReferrals.AsNoTracking().AsQueryable();
            if (scope is > 0) query = query.Where(r => r.FromBrokerProfileId == scope || r.ToBrokerProfileId == scope);
            else if (scope != null) return new ReferralOverview();

            var rows = query.OrderByDescending(r => r.CreatedAt).Take(OverviewLimit).ToList();
            var brokerIds = rows.Select(r => r.FromBrokerProfileId).Concat(rows.Select(r => r.ToBrokerProfileId)).Distinct().ToList();
            var names = _context.BrokerProfiles.AsNoTracking()
                .Where(p => brokerIds.Contains(p.Id))
                .Select(p => new { p.Id, p.DisplayName, p.Oras })
                .ToDictionary(p => p.Id, p => (p.Id, p.DisplayName, p.Oras));
            var progress = Progress(rows);

            if (scope is > 0)
            {
                var sentRows = rows.Where(r => r.FromBrokerProfileId == scope).ToList();
                var receivedRows = rows.Where(r => r.ToBrokerProfileId == scope).ToList();
                var clientNames = ClientNamesForReferrer(sentRows);
                var leadNames = LeadNames(receivedRows);
                return new ReferralOverview
                {
                    Sent = sentRows.Select(r => ToItem(r, names, Perspective.Sender, clientNames, leadNames, progress)).ToList(),
                    Received = receivedRows.Select(r => ToItem(r, names, Perspective.Receiver, clientNames, leadNames, progress)).ToList(),
                };
            }

            var all = ClientNamesForReferrer(rows);
            var leads = LeadNames(rows);
            return new ReferralOverview
            {
                All = rows.Select(r => ToItem(r, names, Perspective.Admin, all, leads, progress)).ToList(),
            };
        }

        public ReferralActionResult Cancel(int referralId)
        {
            var scope = _context.BrokerScopeId;
            if (scope != null && scope is not > 0) return new ReferralActionResult { NotFound = true };
            var referral = _context.ClientReferrals.FirstOrDefault(r => r.Id == referralId && (scope == null || r.FromBrokerProfileId == scope));
            if (referral == null) return new ReferralActionResult { NotFound = true };
            if (referral.Status != ReferralStatuses.AsteaptaClient) return new ReferralActionResult();

            referral.Status = ReferralStatuses.Anulat;
            referral.UpdatedAt = Now;
            try
            {
                _context.SaveChanges();
            }
            catch (DbUpdateConcurrencyException)
            {
                return new ReferralActionResult { Message = "Clientul tocmai a răspuns; reîncarcă pagina." };
            }
            return new ReferralActionResult { Success = true };
        }

        public ReferralConsentPreviewResult PreviewConsent(string? token)
        {
            var referral = FindByToken(token);
            if (referral == null) return new ReferralConsentPreviewResult { Error = ReferralConsentError.NotFound };
            var problem = ProblemOf(referral);
            if (problem != ReferralConsentError.None) return new ReferralConsentPreviewResult { Error = problem };
            return new ReferralConsentPreviewResult { View = ViewOf(referral) };
        }

        public async Task<ReferralRespondResult> RespondAsync(string? token, bool accept, string? ip, string? userAgent)
        {
            var referral = FindByToken(token);
            if (referral == null) return new ReferralRespondResult { Error = ReferralConsentError.NotFound };
            var problem = ProblemOf(referral);
            if (problem != ReferralConsentError.None) return new ReferralRespondResult { Error = problem };

            var now = Now;
            referral.ConsentAt = now;
            referral.ConsentIp = Cut(ip, 64);
            referral.ConsentUserAgent = Cut(userAgent, 500);
            referral.UpdatedAt = now;
            var view = ViewOf(referral);

            if (!accept)
            {
                referral.Status = ReferralStatuses.Refuzat;
                return await SaveAnswerAsync(referral, false, view);
            }

            var contact = ReadContact(referral.ClientUserId, referral.FromBrokerProfileId);
            var fromName = view.FromName;
            var collaboration = referral.Mode == ReferralModes.Colaborare;
            var notes = $"Lead primit de la {fromName}";
            if (!string.IsNullOrWhiteSpace(referral.Note)) notes += $". Notă de la {fromName}: {referral.Note}";

            var lead = new LeadCapture
            {
                BrokerProfileId = referral.ToBrokerProfileId,
                NumePrenume = Cut(contact?.FullName, 120) ?? "",
                Telefon = Cut(contact?.Phone, 20) ?? "",
                Email = Cut(contact?.Email, 200) ?? "",
                Oras = "",
                VenitNetLunar = 0,
                Source = collaboration ? "colaborare" : "transfer",
                Status = LeadStatuses.New,
                AdminNotes = Cut(notes, 1000),
                CreatedAt = now,
                UpdatedAt = now,
            };
            referral.Status = ReferralStatuses.Acceptat;
            referral.Lead = lead;

            var saved = await SaveAnswerAsync(referral, true, view);
            if (saved.Error != ReferralConsentError.None) return saved;

            await NotifyReceiverAsync(referral, fromName, lead, collaboration);
            return saved;
        }

        public Dictionary<int, string> ReceivedFromByLead(IEnumerable<int> leadIds)
        {
            var ids = leadIds.Distinct().ToList();
            if (ids.Count == 0) return new Dictionary<int, string>();
            var scope = _context.BrokerScopeId;
            if (scope != null && scope is not > 0) return new Dictionary<int, string>();

            var rows = _context.ClientReferrals.AsNoTracking()
                .Where(r => r.LeadId != null && ids.Contains(r.LeadId.Value) && r.Status == ReferralStatuses.Acceptat
                            && (scope == null || r.ToBrokerProfileId == scope))
                .Select(r => new { LeadId = r.LeadId!.Value, r.FromBrokerProfileId })
                .ToList();
            var fromIds = rows.Select(r => r.FromBrokerProfileId).Distinct().ToList();
            var names = _context.BrokerProfiles.AsNoTracking().Where(p => fromIds.Contains(p.Id)).Select(p => new { p.Id, p.DisplayName }).ToDictionary(p => p.Id, p => p.DisplayName);
            return rows.Where(r => names.ContainsKey(r.FromBrokerProfileId)).ToDictionary(r => r.LeadId, r => names[r.FromBrokerProfileId]);
        }

        private async Task<ReferralRespondResult> SaveAnswerAsync(ClientReferral referral, bool accepted, ReferralConsentView view)
        {
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return new ReferralRespondResult { Error = ReferralConsentError.Answered };
            }
            return new ReferralRespondResult { Accepted = accepted, View = view };
        }

        private async Task NotifyReceiverAsync(ClientReferral referral, string fromName, LeadCapture lead, bool collaboration)
        {
            try
            {
                var email = _context.BrokerProfiles.AsNoTracking()
                    .Where(p => p.Id == referral.ToBrokerProfileId)
                    .Select(p => p.NotificationEmail ?? p.PublicEmail ?? p.User.Mail)
                    .FirstOrDefault();
                if (string.IsNullOrWhiteSpace(email)) return;
                await _messenger.NotifyReceivedAsync(email, fromName, lead.NumePrenume, lead.Telefon, collaboration, $"https://{Root()}/crm/leaduri");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not notify the receiving broker about referral {ReferralId}", referral.Id);
            }
        }

        private ClientReferral? FindByToken(string? token)
        {
            if (string.IsNullOrWhiteSpace(token) || !TokenPattern.IsMatch(token)) return null;
            var hash = BrokerInviteService.HashToken(token);
            return _context.ClientReferrals.FirstOrDefault(r => r.ConsentTokenHash == hash);
        }

        private ReferralConsentError ProblemOf(ClientReferral referral)
        {
            switch (referral.Status)
            {
                case ReferralStatuses.AsteaptaClient:
                    if (referral.ConsentExpiresAt > Now) return ReferralConsentError.None;
                    referral.Status = ReferralStatuses.Expirat;
                    referral.UpdatedAt = Now;
                    try { _context.SaveChanges(); } catch (DbUpdateConcurrencyException) { }
                    return ReferralConsentError.Expired;
                case ReferralStatuses.Expirat: return ReferralConsentError.Expired;
                case ReferralStatuses.Anulat: return ReferralConsentError.Cancelled;
                default: return ReferralConsentError.Answered;
            }
        }

        private ReferralConsentView ViewOf(ClientReferral referral)
        {
            var names = _context.BrokerProfiles.AsNoTracking()
                .Where(p => p.Id == referral.FromBrokerProfileId || p.Id == referral.ToBrokerProfileId)
                .Select(p => new { p.Id, p.DisplayName, p.Oras })
                .ToList();
            var from = names.FirstOrDefault(p => p.Id == referral.FromBrokerProfileId);
            var to = names.FirstOrDefault(p => p.Id == referral.ToBrokerProfileId);
            return new ReferralConsentView
            {
                FromName = from?.DisplayName ?? "Brokerul tău",
                ToName = to?.DisplayName ?? "un coleg",
                ToOras = to?.Oras,
                Mode = referral.Mode,
                SharePercent = referral.SharePercent,
                ExpiresAt = referral.ConsentExpiresAt,
            };
        }

        private sealed class ClientContact
        {
            public string FullName { get; init; } = "";
            public string FirstName { get; init; } = "";
            public string? Phone { get; init; }
            public string? Email { get; init; }
        }

        /// <summary>
        /// The client's contact data as the referring broker holds it: from that broker's latest acord,
        /// else from the client's account. Read unscoped because the consent answer is anonymous.
        /// </summary>
        private ClientContact? ReadContact(int userId, int fromBrokerId)
        {
            var acord = _context.AcordClients.IgnoreQueryFilters().AsNoTracking()
                .Where(a => a.UserId == userId && a.BrokerProfileId == fromBrokerId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new { a.Nume, a.Prenume, a.Telefon, a.Email })
                .FirstOrDefault();
            var user = _context.Utilizatoris.AsNoTracking()
                .Where(u => u.IdUtilizator == userId)
                .Select(u => new { u.Nume, u.Prenume, u.NumarTelefon, u.Mail })
                .FirstOrDefault();
            if (acord == null && user == null) return null;

            var nume = FirstFilled(acord?.Nume, user?.Nume);
            var prenume = FirstFilled(acord?.Prenume, user?.Prenume);
            return new ClientContact
            {
                FullName = $"{nume} {prenume}".Trim(),
                FirstName = prenume,
                Phone = FirstFilled(acord?.Telefon, user?.NumarTelefon) is { Length: > 0 } p ? p : null,
                Email = FirstFilled(acord?.Email, user?.Mail) is { Length: > 0 } e ? e : null,
            };
        }

        private Dictionary<int, string> ClientNamesForReferrer(List<ClientReferral> rows)
        {
            var result = new Dictionary<int, string>();
            if (rows.Count == 0) return result;
            var userIds = rows.Select(r => r.ClientUserId).Distinct().ToList();
            var brokerIds = rows.Select(r => r.FromBrokerProfileId).Distinct().ToList();
            var acords = _context.AcordClients.IgnoreQueryFilters().AsNoTracking()
                .Where(a => userIds.Contains(a.UserId) && a.BrokerProfileId != null && brokerIds.Contains(a.BrokerProfileId.Value))
                .Select(a => new { a.UserId, BrokerId = a.BrokerProfileId!.Value, a.Nume, a.Prenume, a.CreatedAt })
                .ToList()
                .GroupBy(a => (a.UserId, a.BrokerId))
                .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.CreatedAt).First());
            var users = _context.Utilizatoris.AsNoTracking()
                .Where(u => userIds.Contains(u.IdUtilizator))
                .Select(u => new { u.IdUtilizator, u.Nume, u.Prenume })
                .ToDictionary(u => u.IdUtilizator);
            foreach (var r in rows)
            {
                acords.TryGetValue((r.ClientUserId, r.FromBrokerProfileId), out var acord);
                users.TryGetValue(r.ClientUserId, out var user);
                var name = $"{FirstFilled(acord?.Nume, user?.Nume)} {FirstFilled(acord?.Prenume, user?.Prenume)}".Trim();
                result[r.Id] = string.IsNullOrWhiteSpace(name) ? $"Client #{r.ClientUserId}" : name;
            }
            return result;
        }

        private Dictionary<int, string> LeadNames(List<ClientReferral> rows)
        {
            var ids = rows.Where(r => r.Status == ReferralStatuses.Acceptat && r.LeadId != null).Select(r => r.LeadId!.Value).ToList();
            if (ids.Count == 0) return new Dictionary<int, string>();
            return _context.LeadCaptures.AsNoTracking().Where(l => ids.Contains(l.Id)).Select(l => new { l.Id, l.NumePrenume }).ToDictionary(l => l.Id, l => l.NumePrenume);
        }

        private sealed class ReferralProgress
        {
            public List<ReferralFileItem> Files { get; init; } = new();
            public decimal Share { get; init; }
        }

        /// <summary>
        /// The receiving broker's files for the client of an accepted collaboration. The bridge is the lead
        /// created from the consent: its client (set when the client signs the receiver's acord) and its owner
        /// must be the receiving broker, and only that broker's files for that client are read, as stage rows
        /// (bank, type, amount, stage, date) with no notes or documents. The share is the referral's percent
        /// of the commission the calculator gives the receiver for each disbursed file.
        /// </summary>
        private Dictionary<int, ReferralProgress> Progress(List<ClientReferral> rows)
        {
            var result = new Dictionary<int, ReferralProgress>();
            var accepted = rows.Where(r => r.Status == ReferralStatuses.Acceptat && r.Mode == ReferralModes.Colaborare && r.LeadId != null).ToList();
            if (accepted.Count == 0) return result;

            var leadIds = accepted.Select(r => r.LeadId!.Value).ToList();
            var leads = _context.LeadCaptures.IgnoreQueryFilters().AsNoTracking()
                .Where(l => leadIds.Contains(l.Id))
                .Select(l => new { l.Id, l.UserId, l.BrokerProfileId })
                .ToDictionary(l => l.Id);

            var bridges = new List<(ClientReferral Referral, int ClientUserId)>();
            foreach (var r in accepted)
            {
                if (leads.TryGetValue(r.LeadId!.Value, out var lead) && lead.UserId != null && lead.BrokerProfileId == r.ToBrokerProfileId)
                    bridges.Add((r, lead.UserId.Value));
            }
            foreach (var r in accepted) result[r.Id] = new ReferralProgress();
            if (bridges.Count == 0) return result;

            var userIds = bridges.Select(b => b.ClientUserId).Distinct().ToList();
            var toIds = bridges.Select(b => b.Referral.ToBrokerProfileId).Distinct().ToList();
            var files = _context.BankFiles.IgnoreQueryFilters().AsNoTracking()
                .Where(f => f.BrokerProfileId != null && userIds.Contains(f.UserId) && toIds.Contains(f.BrokerProfileId.Value))
                .Select(f => new { f.BrokerProfileId, f.UserId, f.BankId, f.BankName, f.CreditType, f.Amount, f.Status, f.StatusChangedAt })
                .ToList();

            var months = new Dictionary<string, CommissionMonth>();
            foreach (var (referral, clientUserId) in bridges)
            {
                var mine = files.Where(f => f.BrokerProfileId == referral.ToBrokerProfileId && f.UserId == clientUserId)
                    .OrderByDescending(f => f.StatusChangedAt)
                    .ToList();
                decimal commission = 0;
                foreach (var f in mine.Where(f => f.Status == BankFileStatuses.Disbursat && f.BankId != null && CreditTypes.IsValid(f.CreditType)))
                {
                    var key = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(f.StatusChangedAt, DateTimeKind.Utc), RomaniaTime.Zone).ToString("yyyy-MM");
                    if (!months.TryGetValue(key, out var month)) months[key] = month = _commission.ForMonth(key);
                    commission += month.Commission(f.BrokerProfileId, f.BankId!.Value, f.CreditType, f.Amount);
                }
                result[referral.Id] = new ReferralProgress
                {
                    Files = mine.Select(f => new ReferralFileItem
                    {
                        BankName = f.BankName,
                        CreditType = f.CreditType,
                        Amount = f.Amount,
                        Status = f.Status,
                        StatusChangedAt = f.StatusChangedAt,
                    }).ToList(),
                    Share = Math.Round(commission * referral.SharePercent / 100m, 2, MidpointRounding.AwayFromZero),
                };
            }
            return result;
        }

        private enum Perspective { Sender, Receiver, Admin }

        private ReferralItem ToItem(
            ClientReferral r,
            Dictionary<int, (int Id, string DisplayName, string? Oras)> names,
            Perspective perspective,
            Dictionary<int, string> clientNames,
            Dictionary<int, string> leadNames,
            Dictionary<int, ReferralProgress> progress)
        {
            var status = r.Status == ReferralStatuses.AsteaptaClient && r.ConsentExpiresAt <= Now ? ReferralStatuses.Expirat : r.Status;
            var accepted = status == ReferralStatuses.Acceptat;
            var referrerSide = perspective != Perspective.Receiver;
            names.TryGetValue(r.FromBrokerProfileId, out var from);
            names.TryGetValue(r.ToBrokerProfileId, out var to);
            progress.TryGetValue(r.Id, out var p);

            string? clientName = null;
            if (referrerSide) clientNames.TryGetValue(r.Id, out clientName);
            else if (accepted && r.LeadId != null && leadNames.TryGetValue(r.LeadId.Value, out var leadName)) clientName = leadName;

            return new ReferralItem
            {
                Id = r.Id,
                FromBrokerProfileId = r.FromBrokerProfileId,
                FromBrokerName = from.DisplayName ?? $"Broker #{r.FromBrokerProfileId}",
                ToBrokerProfileId = r.ToBrokerProfileId,
                ToBrokerName = to.DisplayName ?? $"Broker #{r.ToBrokerProfileId}",
                ToBrokerOras = to.Oras,
                ClientUserId = referrerSide ? r.ClientUserId : null,
                ClientName = clientName,
                Mode = r.Mode,
                SharePercent = r.SharePercent,
                Note = referrerSide || accepted ? r.Note : null,
                Status = status,
                CreatedAt = r.CreatedAt,
                ConsentExpiresAt = r.ConsentExpiresAt,
                ConsentAt = r.ConsentAt,
                CanCancel = status == ReferralStatuses.AsteaptaClient && referrerSide,
                Files = referrerSide && p != null ? p.Files : null,
                ShareAmount = p?.Share,
            };
        }

        private string Root() => _configuration["Brokers:RootDomain"] ?? "moneyshop.ro";

        private static ReferralCreateResult Fail(ReferralError error) => new() { Error = error };

        private static string FirstFilled(string? first, string? second) =>
            !string.IsNullOrWhiteSpace(first) ? first.Trim() : second?.Trim() ?? "";

        private static string? Cut(string? value, int max)
        {
            if (value == null) return null;
            return value.Length > max ? value.Substring(0, max) : value;
        }
    }
}
