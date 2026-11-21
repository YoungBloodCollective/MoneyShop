using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>
    /// Tasks, bank files and labels a broker keeps on their clients. Reads go through the broker
    /// query filter, so a broker only ever sees and changes their own rows. A new row belongs to the
    /// signed-in broker; when the Super Admin adds one (unscoped), it belongs to the client's broker.
    /// </summary>
    public class CrmWorkService : ICrmWorkService
    {
        private const int MaxTitle = 200;
        private const int MaxBank = 100;
        private const int MaxNotes = 1000;

        private readonly MoneyShopDbContext _context;

        public CrmWorkService(MoneyShopDbContext context)
        {
            _context = context;
        }

        public CrmClientWork GetClientWork(int userId)
        {
            return new CrmClientWork
            {
                Tasks = _context.ClientTasks.AsNoTracking().Where(t => t.UserId == userId)
                    .OrderBy(t => t.DoneAt != null).ThenBy(t => t.DueAt)
                    .AsEnumerable().Select(t => ToItem(t, null)).ToList(),
                BankFiles = _context.BankFiles.AsNoTracking().Where(f => f.UserId == userId)
                    .OrderByDescending(f => f.CreatedAt)
                    .AsEnumerable().Select(f => ToItem(f, null)).ToList(),
                Tags = SortTags(_context.ClientTags.AsNoTracking().Where(t => t.UserId == userId).Select(t => t.Tag).ToList()),
            };
        }

        public CrmTaskItem AddTask(int userId, string title, DateTime dueAtUtc)
        {
            var task = new ClientTask
            {
                BrokerProfileId = OwnerFor(userId),
                UserId = userId,
                Title = Trim(title, MaxTitle)!,
                DueAt = DateTime.SpecifyKind(dueAtUtc, DateTimeKind.Utc),
                CreatedAt = DateTime.UtcNow,
            };
            _context.ClientTasks.Add(task);
            _context.SaveChanges();
            return ToItem(task, null);
        }

        public CrmTaskItem? SetTaskDone(int taskId, bool done)
        {
            var task = _context.ClientTasks.FirstOrDefault(t => t.Id == taskId);
            if (task == null) return null;
            task.DoneAt = done ? task.DoneAt ?? DateTime.UtcNow : null;
            _context.SaveChanges();
            return ToItem(task, null);
        }

        public bool DeleteTask(int taskId)
        {
            var task = _context.ClientTasks.FirstOrDefault(t => t.Id == taskId);
            if (task == null) return false;
            _context.ClientTasks.Remove(task);
            _context.SaveChanges();
            return true;
        }

        public CrmBankFileItem AddBankFile(int userId, CrmBankFileInput input)
        {
            var now = DateTime.UtcNow;
            var file = new BankFile
            {
                BrokerProfileId = OwnerFor(userId),
                UserId = userId,
                BankName = Trim(input.BankName, MaxBank)!,
                Amount = Math.Round(input.Amount, 2),
                Status = input.Status!,
                StatusChangedAt = now,
                Notes = Trim(input.Notes, MaxNotes),
                CreatedAt = now,
                UpdatedAt = now,
            };
            _context.BankFiles.Add(file);
            _context.SaveChanges();
            return ToItem(file, null);
        }

        public CrmBankFileItem? UpdateBankFile(int bankFileId, CrmBankFileInput input)
        {
            var file = _context.BankFiles.FirstOrDefault(f => f.Id == bankFileId);
            if (file == null) return null;
            var now = DateTime.UtcNow;
            if (file.Status != input.Status) file.StatusChangedAt = now;
            file.BankName = Trim(input.BankName, MaxBank)!;
            file.Amount = Math.Round(input.Amount, 2);
            file.Status = input.Status!;
            file.Notes = Trim(input.Notes, MaxNotes);
            file.UpdatedAt = now;
            _context.SaveChanges();
            return ToItem(file, null);
        }

        public bool DeleteBankFile(int bankFileId)
        {
            var file = _context.BankFiles.FirstOrDefault(f => f.Id == bankFileId);
            if (file == null) return false;
            _context.BankFiles.Remove(file);
            _context.SaveChanges();
            return true;
        }

        public List<string> SetTags(int userId, IEnumerable<string> tags)
        {
            var wanted = tags.Where(t => ClientTagKeys.All.Contains(t)).Distinct().ToList();
            var existing = _context.ClientTags.Where(t => t.UserId == userId).ToList();
            _context.ClientTags.RemoveRange(existing.Where(e => !wanted.Contains(e.Tag)));
            var owner = OwnerFor(userId);
            foreach (var tag in wanted.Where(w => existing.All(e => e.Tag != w)))
            {
                _context.ClientTags.Add(new ClientTag { BrokerProfileId = owner, UserId = userId, Tag = tag, CreatedAt = DateTime.UtcNow });
            }
            _context.SaveChanges();
            return SortTags(wanted);
        }

        public Dictionary<int, List<string>> GetTagsByClient() =>
            _context.ClientTags.AsNoTracking()
                .Select(t => new { t.UserId, t.Tag })
                .AsEnumerable()
                .GroupBy(t => t.UserId)
                .ToDictionary(g => g.Key, g => SortTags(g.Select(t => t.Tag).Distinct().ToList()));

        public CrmWorkBoard GetBoard()
        {
            var files = _context.BankFiles.AsNoTracking().OrderByDescending(f => f.StatusChangedAt).ToList();
            var tasks = _context.ClientTasks.AsNoTracking().Where(t => t.DoneAt == null).OrderBy(t => t.DueAt).ToList();
            var names = ClientNames(files.Select(f => f.UserId).Concat(tasks.Select(t => t.UserId)));
            return new CrmWorkBoard
            {
                BankFiles = files.Select(f => ToItem(f, names)).ToList(),
                OpenTasks = tasks.Select(t => ToItem(t, names)).ToList(),
            };
        }

        public List<CrmDueTaskReminder> GetDueReminders(DateTime nowUtc)
        {
            var due = _context.ClientTasks.IgnoreQueryFilters().AsNoTracking()
                .Where(t => t.DoneAt == null && t.ReminderSentAt == null && t.DueAt <= nowUtc)
                .OrderBy(t => t.DueAt)
                .Take(50)
                .ToList();
            if (due.Count == 0) return new List<CrmDueTaskReminder>();

            var userIds = due.Select(t => t.UserId).Distinct().ToList();
            var users = _context.Utilizatoris.AsNoTracking().Where(u => userIds.Contains(u.IdUtilizator))
                .Select(u => new { u.IdUtilizator, u.Prenume, u.Nume, u.NumarTelefon })
                .ToDictionary(u => u.IdUtilizator);
            var acords = _context.AcordClients.IgnoreQueryFilters().AsNoTracking().Where(a => userIds.Contains(a.UserId))
                .Select(a => new { a.UserId, a.Prenume, a.Nume, a.Telefon, a.CreatedAt })
                .AsEnumerable()
                .GroupBy(a => a.UserId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.CreatedAt).First());

            return due.Select(t =>
            {
                users.TryGetValue(t.UserId, out var u);
                acords.TryGetValue(t.UserId, out var a);
                return new CrmDueTaskReminder
                {
                    TaskId = t.Id,
                    BrokerProfileId = t.BrokerProfileId,
                    UserId = t.UserId,
                    ClientName = Name(u?.Prenume, u?.Nume, a?.Prenume, a?.Nume, t.UserId),
                    ClientPhone = u?.NumarTelefon ?? a?.Telefon,
                    Title = t.Title,
                    DueAt = t.DueAt,
                };
            }).ToList();
        }

        public void MarkReminderSent(int taskId, DateTime nowUtc)
        {
            var task = _context.ClientTasks.IgnoreQueryFilters().FirstOrDefault(t => t.Id == taskId);
            if (task == null) return;
            task.ReminderSentAt = nowUtc;
            _context.SaveChanges();
        }

        /// <summary>The signed-in broker; for the Super Admin, the broker who owns the client.</summary>
        private int? OwnerFor(int userId)
        {
            if (_context.BrokerScopeId is > 0) return _context.BrokerScopeId;
            return _context.AcordClients.Where(a => a.UserId == userId && a.BrokerProfileId != null)
                       .OrderByDescending(a => a.CreatedAt).Select(a => a.BrokerProfileId).FirstOrDefault()
                   ?? _context.Applications.Where(a => a.UserId == userId && a.BrokerProfileId != null)
                       .OrderByDescending(a => a.UpdatedAt).Select(a => a.BrokerProfileId).FirstOrDefault();
        }

        private Dictionary<int, string> ClientNames(IEnumerable<int> ids)
        {
            var userIds = ids.Distinct().ToList();
            if (userIds.Count == 0) return new Dictionary<int, string>();
            var users = _context.Utilizatoris.AsNoTracking().Where(u => userIds.Contains(u.IdUtilizator))
                .Select(u => new { u.IdUtilizator, u.Prenume, u.Nume })
                .ToDictionary(u => u.IdUtilizator);
            var acords = _context.AcordClients.AsNoTracking().Where(a => userIds.Contains(a.UserId))
                .Select(a => new { a.UserId, a.Prenume, a.Nume, a.CreatedAt })
                .AsEnumerable()
                .GroupBy(a => a.UserId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.CreatedAt).First());
            return userIds.ToDictionary(id => id, id =>
            {
                users.TryGetValue(id, out var u);
                acords.TryGetValue(id, out var a);
                return Name(u?.Prenume, u?.Nume, a?.Prenume, a?.Nume, id);
            });
        }

        private static string Name(string? userPrenume, string? userNume, string? acordPrenume, string? acordNume, int userId)
        {
            var full = $"{userPrenume} {userNume}".Trim();
            if (string.IsNullOrWhiteSpace(full)) full = $"{acordPrenume} {acordNume}".Trim();
            return string.IsNullOrWhiteSpace(full) ? $"Client #{userId}" : full;
        }

        private static List<string> SortTags(List<string> tags) =>
            tags.OrderBy(t => Array.IndexOf(ClientTagKeys.All, t)).ToList();

        private static string? Trim(string? value, int max)
        {
            var v = value?.Trim();
            if (string.IsNullOrEmpty(v)) return null;
            return v.Length > max ? v.Substring(0, max) : v;
        }

        private static CrmTaskItem ToItem(ClientTask t, Dictionary<int, string>? names) => new()
        {
            Id = t.Id,
            UserId = t.UserId,
            ClientName = names != null && names.TryGetValue(t.UserId, out var n) ? n : null,
            Title = t.Title,
            DueAt = t.DueAt,
            DoneAt = t.DoneAt,
            CreatedAt = t.CreatedAt,
        };

        private static CrmBankFileItem ToItem(BankFile f, Dictionary<int, string>? names) => new()
        {
            Id = f.Id,
            UserId = f.UserId,
            ClientName = names != null && names.TryGetValue(f.UserId, out var n) ? n : null,
            BankName = f.BankName,
            Amount = f.Amount,
            Status = f.Status,
            StatusChangedAt = f.StatusChangedAt,
            Notes = f.Notes,
            CreatedAt = f.CreatedAt,
            UpdatedAt = f.UpdatedAt,
        };
    }
}
