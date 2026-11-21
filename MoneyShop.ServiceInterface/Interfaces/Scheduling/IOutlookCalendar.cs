namespace MoneyShop.ServiceInterface.Interfaces.Scheduling;

/// <summary>An event MoneyShop writes into a broker's Outlook calendar for one appointment.</summary>
public record OutlookEvent(int AppointmentId, DateTime StartUtc, DateTime EndUtc, string Subject, string Body, string Version);

/// <summary>An event read from a broker's Outlook calendar. AppointmentId is set only on events MoneyShop wrote.</summary>
public record OutlookCalendarItem(string EventId, int? AppointmentId, string? Version, DateTime StartUtc, DateTime EndUtc, string ShowAs, bool IsCancelled);

public record BusyInterval(DateTime StartUtc, DateTime EndUtc);

/// <summary>
/// Brokers' Outlook (Microsoft 365) calendars through Microsoft Graph, as the MoneyShop app itself
/// (application permission). Off until Graph:TenantId / ClientId / ClientSecret are configured.
/// </summary>
public interface IOutlookCalendar
{
    bool Enabled { get; }

    /// <summary>The broker's Microsoft 365 mailbox, or null when they have none in the company domain.</summary>
    string? MailboxFor(string? slug, string? notificationEmail, string? publicEmail);

    Task<List<OutlookCalendarItem>> ListAsync(string mailbox, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);
    Task CreateAsync(string mailbox, OutlookEvent ev, CancellationToken ct = default);
    Task UpdateAsync(string mailbox, string eventId, OutlookEvent ev, CancellationToken ct = default);
    Task DeleteAsync(string mailbox, string eventId, CancellationToken ct = default);
}

/// <summary>Writes each broker's appointments into their Outlook calendar and keeps them in step.</summary>
public interface IOutlookSyncService
{
    Task<OutlookSyncReport> SyncAllAsync(DateTime nowUtc, CancellationToken ct = default);
}

public record OutlookSyncReport(int Mailboxes, int Created, int Updated, int Deleted, int Failed);

/// <summary>Times a broker is busy in Outlook (meetings not written by MoneyShop), for public booking.</summary>
public interface IOutlookBusyTimes
{
    Task<List<BusyInterval>> GetAsync(int brokerProfileId, DateTime fromUtc, DateTime toUtc, DateTime nowUtc);
}
