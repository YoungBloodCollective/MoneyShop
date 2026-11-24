using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    public class ClientCoDebtorService : IClientCoDebtorService
    {
        private const string AcordCompleted = "completed";
        private const int CandidateLimit = 20;

        private readonly MoneyShopDbContext _context;
        private readonly ILogger<ClientCoDebtorService> _logger;

        public ClientCoDebtorService(MoneyShopDbContext context, ILogger<ClientCoDebtorService> logger)
        {
            _context = context;
            _logger = logger;
        }

        private int? ResolveBroker(int clientUserId)
        {
            var scope = _context.BrokerScopeId;
            if (scope is <= 0) return null;
            var broker = _context.AcordClients.AsNoTracking()
                .Where(a => a.UserId == clientUserId && a.BrokerProfileId != null)
                .Select(a => a.BrokerProfileId).FirstOrDefault();
            broker ??= _context.Applications.AsNoTracking()
                .Where(a => a.UserId == clientUserId && a.BrokerProfileId != null)
                .Select(a => a.BrokerProfileId).FirstOrDefault();
            if (scope is > 0) return broker == scope ? scope : null;
            return broker;
        }

        public CoDebtorsView Get(int clientUserId)
        {
            var forward = _context.ClientCoDebtors.AsNoTracking().Where(r => r.ClientUserId == clientUserId).OrderBy(r => r.CreatedAt).ToList();
            var backward = _context.ClientCoDebtors.AsNoTracking().Where(r => r.CoDebtorUserId == clientUserId).OrderBy(r => r.CreatedAt).ToList();
            var ids = forward.Select(r => r.CoDebtorUserId).Concat(backward.Select(r => r.ClientUserId)).Distinct().ToList();
            var people = LoadPeople(ids);
            return new CoDebtorsView
            {
                CoDebtors = forward.Select(r => ToItem(r, r.CoDebtorUserId, r.Relation, people)).ToList(),
                CoDebtorFor = backward.Select(r => ToItem(r, r.ClientUserId, CoDebtorRelations.Inverse(r.Relation), people)).ToList(),
            };
        }

        public List<CoDebtorCandidate> SearchCandidates(int clientUserId, string? q)
        {
            var broker = ResolveBroker(clientUserId);
            if (broker == null) return new List<CoDebtorCandidate>();
            var term = q?.Trim().ToLowerInvariant() ?? "";
            if (term.Length == 1) return new List<CoDebtorCandidate>();

            var linked = _context.ClientCoDebtors.IgnoreQueryFilters().AsNoTracking()
                .Where(r => r.ClientUserId == clientUserId).Select(r => r.CoDebtorUserId)
                .Concat(_context.ClientCoDebtors.IgnoreQueryFilters().AsNoTracking()
                    .Where(r => r.CoDebtorUserId == clientUserId).Select(r => r.ClientUserId))
                .ToList();

            var query = _context.AcordClients.AsNoTracking()
                .Where(a => a.BrokerProfileId == broker && a.Status == AcordCompleted && a.UserId != clientUserId && !linked.Contains(a.UserId));
            if (term.Length >= 2)
            {
                var compact = term.Replace(" ", "").Replace("+", "");
                var phoneSearch = compact.Length >= 2 && compact.All(char.IsDigit);
                query = phoneSearch
                    ? query.Where(a => a.Telefon.Contains(compact))
                    : query.Where(a => (a.Prenume + " " + a.Nume).ToLower().Contains(term) || (a.Nume + " " + a.Prenume).ToLower().Contains(term));
            }

            var rows = query.OrderByDescending(a => a.SignedAt).ThenByDescending(a => a.UpdatedAt).Take(200)
                .Select(a => new { a.UserId, a.Prenume, a.Nume, a.Telefon, a.SignedAt })
                .ToList();
            var chosen = rows.GroupBy(r => r.UserId).Select(g => g.First()).Take(CandidateLimit).ToList();
            var chosenIds = chosen.Select(c => c.UserId).ToList();
            var users = _context.Utilizatoris.AsNoTracking()
                .Where(u => chosenIds.Contains(u.IdUtilizator))
                .ToDictionary(u => u.IdUtilizator);
            return chosen.Select(c =>
            {
                users.TryGetValue(c.UserId, out var user);
                return new CoDebtorCandidate
                {
                    UserId = c.UserId,
                    FullName = CrmService.FullName(user, c.Prenume, c.Nume, c.UserId),
                    Phone = user?.NumarTelefon ?? c.Telefon,
                    AcordSignedAt = c.SignedAt,
                };
            }).ToList();
        }

        public async Task<CoDebtorCreateResult> AddAsync(int clientUserId, CoDebtorCreateInput input)
        {
            var broker = ResolveBroker(clientUserId);
            if (broker == null) return Fail(CoDebtorError.ClientNotVisible);

            var relation = input.Relation?.Trim();
            if (!CoDebtorRelations.IsValid(relation)) return Fail(CoDebtorError.InvalidRelation);
            var coDebtorId = input.CoDebtorUserId;
            if (coDebtorId == clientUserId) return Fail(CoDebtorError.Self);
            if (coDebtorId <= 0) return Fail(CoDebtorError.NoAcord);

            var signed = _context.AcordClients.AsNoTracking()
                .Any(a => a.UserId == coDebtorId && a.Status == AcordCompleted && a.BrokerProfileId == broker);
            if (!signed)
            {
                var elsewhere = _context.BrokerScopeId == null
                    && _context.AcordClients.AsNoTracking().Any(a => a.UserId == coDebtorId && a.Status == AcordCompleted);
                return Fail(elsewhere ? CoDebtorError.DifferentBroker : CoDebtorError.NoAcord);
            }

            var duplicate = _context.ClientCoDebtors.IgnoreQueryFilters().Any(r =>
                (r.ClientUserId == clientUserId && r.CoDebtorUserId == coDebtorId)
                || (r.ClientUserId == coDebtorId && r.CoDebtorUserId == clientUserId));
            if (duplicate) return Fail(CoDebtorError.Duplicate);

            var row = new ClientCoDebtor
            {
                BrokerProfileId = broker,
                ClientUserId = clientUserId,
                CoDebtorUserId = coDebtorId,
                Relation = relation!,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = _context.AuditActor?.UserId,
            };
            _context.ClientCoDebtors.Add(row);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                _context.Entry(row).State = EntityState.Detached;
                return Fail(CoDebtorError.Duplicate);
            }

            _logger.LogInformation("Co-debtor {CoDebtorUserId} linked to client {ClientUserId} (link {LinkId}, broker {BrokerProfileId})", coDebtorId, clientUserId, row.Id, broker);
            return new CoDebtorCreateResult { Item = ToItem(row, coDebtorId, row.Relation, LoadPeople(new List<int> { coDebtorId })) };
        }

        public async Task<bool> RemoveAsync(int clientUserId, int id)
        {
            var row = _context.ClientCoDebtors.FirstOrDefault(r => r.Id == id && r.ClientUserId == clientUserId);
            if (row == null) return false;
            _context.ClientCoDebtors.Remove(row);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Co-debtor link {LinkId} removed from client {ClientUserId}", id, clientUserId);
            return true;
        }

        private sealed record Person(string FullName, string? Phone, string? AcordStatus, DateTime? AcordSignedAt);

        private Dictionary<int, Person> LoadPeople(List<int> ids)
        {
            if (ids.Count == 0) return new Dictionary<int, Person>();
            var users = _context.Utilizatoris.AsNoTracking().Where(u => ids.Contains(u.IdUtilizator)).ToDictionary(u => u.IdUtilizator);
            var acords = _context.AcordClients.AsNoTracking().Where(a => ids.Contains(a.UserId))
                .Select(a => new { a.UserId, a.Status, a.SignedAt, a.Prenume, a.Nume, a.Telefon, a.UpdatedAt })
                .ToList()
                .GroupBy(a => a.UserId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.Status == AcordCompleted).ThenByDescending(a => a.UpdatedAt).First());
            var result = new Dictionary<int, Person>();
            foreach (var id in ids)
            {
                users.TryGetValue(id, out var user);
                acords.TryGetValue(id, out var acord);
                result[id] = new Person(
                    CrmService.FullName(user, acord?.Prenume, acord?.Nume, id),
                    user?.NumarTelefon ?? acord?.Telefon,
                    acord?.Status,
                    acord?.SignedAt);
            }
            return result;
        }

        private static CoDebtorItem ToItem(ClientCoDebtor row, int otherUserId, string relation, Dictionary<int, Person> people)
        {
            people.TryGetValue(otherUserId, out var person);
            return new CoDebtorItem
            {
                Id = row.Id,
                UserId = otherUserId,
                FullName = person?.FullName ?? $"Client #{otherUserId}",
                Phone = person?.Phone,
                Relation = relation,
                RelationLabel = CoDebtorRelations.Label(relation) ?? relation,
                AcordStatus = person?.AcordStatus,
                AcordSignedAt = person?.AcordSignedAt,
                CreatedAt = row.CreatedAt,
            };
        }

        private static CoDebtorCreateResult Fail(CoDebtorError error) => new() { Error = error };
    }
}
