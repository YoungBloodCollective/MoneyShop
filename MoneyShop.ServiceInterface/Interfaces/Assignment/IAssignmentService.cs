namespace MoneyShop.ServiceInterface.Interfaces.Assignment;

/// <summary>
/// Super Admin lead distribution. Appointments, leads and acords each have a broker owner;
/// records with no owner wait in the Super Admin inbox. Assigning or transferring only changes
/// the owner (it never converts a lead into a client or opens a file) and is always audited.
/// </summary>
public interface IAssignmentService
{
    Task<List<InboxItem>> GetInboxAsync(int limitPerType = 300);
    Task<AssignOutcome> AssignAsync(AssignInput input, AssignActor actor);
    Task<List<AssignmentHistoryItem>> GetHistoryAsync(string entityType, string id);
}

public static class AssignableTypes
{
    public const string Appointment = "appointment";
    public const string Lead = "lead";
    public const string Acord = "acord";

    public static string? Normalize(string? value)
    {
        var v = value?.Trim().ToLowerInvariant();
        return v is Appointment or Lead or Acord ? v : null;
    }
}

public record InboxItem(string EntityType, string Id, string Name, string? Phone, string? Email,
    string? Detail, string? Status, string? Source, DateTime CreatedAt);

public class AssignInput
{
    public string? EntityType { get; set; }
    public string? Id { get; set; }
    public int? BrokerProfileId { get; set; }
    public string? Reason { get; set; }
}

public record AssignActor(int? UserId, string? Role, string? Ip);

public enum AssignError { None, InvalidType, InvalidId, NotFound, BrokerNotFound, BrokerInactive }

public class AssignOutcome
{
    public AssignError Error { get; init; }
    public string? EntityType { get; init; }
    public string? Id { get; init; }
    public int? FromBrokerProfileId { get; init; }
    public int? ToBrokerProfileId { get; init; }
    /// <summary>assign, transfer, unassign or unchanged.</summary>
    public string Action { get; init; } = "unchanged";
    public string ClientName { get; init; } = "";
    public string? ClientPhone { get; init; }
    /// <summary>Where the record lives in the broker CRM, e.g. /crm/programari.</summary>
    public string CrmPath { get; init; } = "/crm";

    public bool Ok => Error == AssignError.None;
    public static AssignOutcome Fail(AssignError error) => new() { Error = error };
}

public record AssignmentHistoryItem(DateTime OccurredAt, string Action, int? ActorUserId,
    string? OldValueJson, string? NewValueJson, string? Reason);
