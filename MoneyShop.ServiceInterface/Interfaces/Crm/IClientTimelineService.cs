namespace MoneyShop.ServiceInterface.Interfaces.Crm;

/// <summary>One thing that happened with a client, for the "Istoric" card on the client file.</summary>
public record TimelineItem(DateTime AtUtc, string Kind, string Title, string? Detail);

/// <summary>
/// The client's story in one list, newest first: call requests and appointments (with their notes),
/// the agreement, credit bureau reports, income updates and file status changes. Everything comes
/// from data the CRM already keeps; nothing new is recorded here.
/// </summary>
public interface IClientTimelineService
{
    Task<List<TimelineItem>> GetAsync(int userId, int max = 100);
}
