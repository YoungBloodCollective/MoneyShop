using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MoneyShop.DomainModel.Entities;
using MoneyShop.Infrastructure.EntityFramework.DBContext;
using MoneyShop.ServiceAdapters.Services.Lead;
using MoneyShop.ServiceInterface.Interfaces.Assignment;

namespace MoneyShop.ServiceAdapters.Services.Assignment;

public class AssignmentService : IAssignmentService
{
    public const string ActionAssign = "assign";
    public const string ActionTransfer = "transfer";
    public const string ActionUnassign = "unassign";
    public const string ActionUnchanged = "unchanged";
    private static readonly string[] AssignmentActions = { ActionAssign, ActionTransfer, ActionUnassign };

    private readonly MoneyShopDbContext _db;

    public AssignmentService(MoneyShopDbContext db)
    {
        _db = db;
    }

    public async Task<List<InboxItem>> GetInboxAsync(int limitPerType = 300)
    {
        // Rows are read first and shaped in memory, so no id formatting has to translate to SQL.
        var appointmentRows = await _db.Appointments.AsNoTracking()
                .Where(a => a.BrokerProfileId == null)
                .OrderByDescending(a => a.CreatedAt).Take(limitPerType)
                .Select(a => new { a.Id, a.Nume, a.Prenume, a.Telefon, a.Email, a.TipCredit, a.Status, a.CreatedAt, a.SalariuNet, a.IntarzieriBirou, a.PopriRecuperare })
                .ToListAsync();
        var appointmentPhones = appointmentRows.Select(a => LeadService.NormalizePhone(a.Telefon)).Where(p => p.Length > 0).ToHashSet();
        var appointments = appointmentRows
            .Select(a => new InboxItem(AssignableTypes.Appointment, a.Id.ToString(), $"{a.Nume} {a.Prenume}".Trim(),
                a.Telefon, a.Email, a.TipCredit, a.Status, "Programare apel", a.CreatedAt,
                Answers(a.SalariuNet, a.IntarzieriBirou, a.PopriRecuperare)));

        var leads = (await _db.LeadCaptures.AsNoTracking()
                .Where(l => l.BrokerProfileId == null)
                .OrderByDescending(l => l.CreatedAt).Take(limitPerType)
                .Select(l => new { l.Id, l.NumePrenume, l.Telefon, l.Email, l.Oras, l.Source, l.CreatedAt })
                .ToListAsync())
            // A lead made from a site appointment is the same request; the appointment card stands for both.
            .Where(l => l.Source != LeadFromAppointmentSource || !appointmentPhones.Contains(LeadService.NormalizePhone(l.Telefon)))
            .Select(l => new InboxItem(AssignableTypes.Lead, l.Id.ToString(), l.NumePrenume,
                l.Telefon, l.Email, l.Oras, null, l.Source, l.CreatedAt));

        var acords = (await _db.AcordClients.AsNoTracking()
                .Where(a => a.BrokerProfileId == null)
                .OrderByDescending(a => a.CreatedAt).Take(limitPerType)
                .Select(a => new { a.AcordId, a.Nume, a.Prenume, a.Telefon, a.Email, a.Status, a.CreatedAt })
                .ToListAsync())
            .Select(a => new InboxItem(AssignableTypes.Acord, a.AcordId.ToString(), $"{a.Nume} {a.Prenume}".Trim(),
                a.Telefon, a.Email, null, a.Status, "Acord", a.CreatedAt));

        return appointments.Concat(leads).Concat(acords)
            .OrderByDescending(i => i.CreatedAt)
            .ToList();
    }

    public async Task<AssignOutcome> AssignAsync(AssignInput input, AssignActor actor)
    {
        var type = AssignableTypes.Normalize(input.EntityType);
        if (type == null) return AssignOutcome.Fail(AssignError.InvalidType);
        var id = input.Id?.Trim() ?? string.Empty;

        BrokerProfile? broker = null;
        if (input.BrokerProfileId.HasValue)
        {
            broker = await _db.BrokerProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.Id == input.BrokerProfileId.Value);
            if (broker == null) return AssignOutcome.Fail(AssignError.BrokerNotFound);
            if (broker.Status != "Active") return AssignOutcome.Fail(AssignError.BrokerInactive);
        }
        var newOwner = broker?.Id;

        int? oldOwner;
        string clientName;
        string? phone;
        string crmPath;

        switch (type)
        {
            case AssignableTypes.Appointment:
            {
                if (!int.TryParse(id, out var appointmentId)) return AssignOutcome.Fail(AssignError.InvalidId);
                var appointment = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == appointmentId);
                if (appointment == null) return AssignOutcome.Fail(AssignError.NotFound);
                oldOwner = appointment.BrokerProfileId;
                if (oldOwner != newOwner)
                {
                    appointment.BrokerProfileId = newOwner;
                    appointment.UpdatedAt = DateTime.UtcNow;
                    var phoneKey = LeadService.NormalizePhone(appointment.Telefon);
                    if (phoneKey.Length > 0)
                    {
                        var twins = (await _db.LeadCaptures
                                .Where(l => l.Source == LeadFromAppointmentSource && l.BrokerProfileId == oldOwner)
                                .ToListAsync())
                            .Where(l => LeadService.NormalizePhone(l.Telefon) == phoneKey);
                        foreach (var twin in twins)
                        {
                            twin.BrokerProfileId = newOwner;
                            twin.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }
                clientName = $"{appointment.Nume} {appointment.Prenume}".Trim();
                phone = appointment.Telefon;
                crmPath = "/crm/programari";
                break;
            }
            case AssignableTypes.Lead:
            {
                if (!int.TryParse(id, out var leadId)) return AssignOutcome.Fail(AssignError.InvalidId);
                var lead = await _db.LeadCaptures.FirstOrDefaultAsync(l => l.Id == leadId);
                if (lead == null) return AssignOutcome.Fail(AssignError.NotFound);
                oldOwner = lead.BrokerProfileId;
                if (oldOwner != newOwner)
                {
                    lead.BrokerProfileId = newOwner;
                    lead.UpdatedAt = DateTime.UtcNow;
                }
                clientName = lead.NumePrenume;
                phone = lead.Telefon;
                crmPath = "/crm/leaduri";
                break;
            }
            default:
            {
                if (!Guid.TryParse(id, out var acordId)) return AssignOutcome.Fail(AssignError.InvalidId);
                var acord = await _db.AcordClients.FirstOrDefaultAsync(a => a.AcordId == acordId);
                if (acord == null) return AssignOutcome.Fail(AssignError.NotFound);
                oldOwner = acord.BrokerProfileId;
                if (oldOwner != newOwner)
                {
                    acord.BrokerProfileId = newOwner;
                    // The bank consents signed for this acord belong to the same broker.
                    var consents = await _db.BankConsentRequests.Where(c => c.AcordId == acordId).ToListAsync();
                    foreach (var consent in consents) consent.BrokerProfileId = newOwner;
                }
                clientName = $"{acord.Nume} {acord.Prenume}".Trim();
                phone = acord.Telefon;
                crmPath = $"/crm/acorduri/{acordId}";
                id = acordId.ToString();
                break;
            }
        }

        var action = oldOwner == newOwner ? ActionUnchanged
            : oldOwner == null ? ActionAssign
            : newOwner == null ? ActionUnassign
            : ActionTransfer;

        if (action != ActionUnchanged)
        {
            var reason = string.IsNullOrWhiteSpace(input.Reason) ? null : input.Reason.Trim();
            if (reason?.Length > 500) reason = reason[..500];

            _db.AuditEvents.Add(new AuditEvent
            {
                OccurredAt = DateTime.UtcNow,
                ActorUserId = actor.UserId,
                ActorRole = actor.Role,
                ActorIp = actor.Ip,
                BrokerProfileId = newOwner,
                EntityType = type,
                EntityId = id,
                Action = action,
                OldValueJson = JsonSerializer.Serialize(new { brokerProfileId = oldOwner }),
                NewValueJson = JsonSerializer.Serialize(new { brokerProfileId = newOwner }),
                Reason = reason,
            });
            await _db.SaveChangesAsync();
        }

        return new AssignOutcome
        {
            EntityType = type,
            Id = id,
            FromBrokerProfileId = oldOwner,
            ToBrokerProfileId = newOwner,
            Action = action,
            ClientName = clientName,
            ClientPhone = phone,
            CrmPath = crmPath,
        };
    }

    private const string LeadFromAppointmentSource = "appointment";
    private static readonly CultureInfo Ro = CultureInfo.GetCultureInfo("ro-RO");

    private static string? Answers(decimal salariuNet, string? intarzieriBirou, string? popriRecuperare)
    {
        var parts = new List<string>();
        if (salariuNet > 0) parts.Add($"Venit {salariuNet.ToString("N0", Ro)} lei");
        if (!string.IsNullOrWhiteSpace(intarzieriBirou))
            parts.Add($"Întârzieri BC: {(intarzieriBirou.Equals("NU", StringComparison.OrdinalIgnoreCase) ? "nu" : intarzieriBirou.Replace("Da-", "da, ", StringComparison.OrdinalIgnoreCase))}");
        if (!string.IsNullOrWhiteSpace(popriRecuperare))
            parts.Add($"Popriri/recuperare: {(popriRecuperare.Equals("DA", StringComparison.OrdinalIgnoreCase) ? "da" : "nu")}");
        return parts.Count == 0 ? null : string.Join(" · ", parts);
    }

    public async Task<List<AssignmentHistoryItem>> GetHistoryAsync(string entityType, string id)
    {
        var type = AssignableTypes.Normalize(entityType);
        if (type == null) return new List<AssignmentHistoryItem>();
        var key = id.Trim();
        return await _db.AuditEvents.AsNoTracking()
            .Where(e => e.EntityType == type && e.EntityId == key && AssignmentActions.Contains(e.Action))
            .OrderByDescending(e => e.OccurredAt)
            .Select(e => new AssignmentHistoryItem(e.OccurredAt, e.Action, e.ActorUserId, e.OldValueJson, e.NewValueJson, e.Reason))
            .ToListAsync();
    }
}
