namespace MoneyShop.ServiceInterface.Interfaces.Ads;

/// <summary>A Google Ads click that became a qualified lead.</summary>
public record OfflineConversion(string Gclid, DateTime AtUtc);

public interface IOfflineConversionService
{
    /// <summary>Qualified leads with a Google click id from the last 89 days, one per click.</summary>
    Task<List<OfflineConversion>> GetQualifiedAsync(DateTime nowUtc);
}
