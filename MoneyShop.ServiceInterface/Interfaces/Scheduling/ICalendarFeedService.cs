namespace MoneyShop.ServiceInterface.Interfaces.Scheduling;

/// <summary>
/// The broker's appointments as a calendar that Outlook, iPhone or Google Calendar subscribe to.
/// The secret link (broker id + signed token) is the only credential, so calendar apps can fetch it.
/// </summary>
public interface ICalendarFeedService
{
    /// <summary>The secret token for a broker's feed; changes only when the signing key changes.</summary>
    string TokenFor(int brokerProfileId);

    bool IsValidToken(int brokerProfileId, string? token);

    /// <summary>The .ics text: appointments from the last 30 days to the next 90, without cancelled ones.</summary>
    Task<string?> BuildFeedAsync(int brokerProfileId, DateTime nowUtc);
}
