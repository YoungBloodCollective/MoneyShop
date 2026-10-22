namespace MoneyShop.ServiceInterface.Interfaces.Acord;

/// <summary>
/// Bank consent links: from a signed acord, a broker generates a link to one bank's
/// own consent form, filled with the client's data; the client reads and signs it,
/// and the signed PDF is kept on the acord for the broker to download.
/// </summary>
public interface IBankConsentService
{
    List<BankConsentBank> ListBanks();
    List<BankConsentInfo> ListForAcord(Guid acordId);
    BankConsentCreateResult CreateForAcord(Guid acordId, string bankCode, int? createdByUserId);

    BankConsentPublicView? GetByToken(string token);
    BankConsentSignResult Sign(string token, byte[] signaturePng, string? ip, string? userAgent);
}

public class BankConsentBank
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
}

public class BankConsentInfo
{
    public Guid Id { get; set; }
    public string BankCode { get; set; } = null!;
    public string BankName { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? SignedAt { get; set; }
    public Guid? FileId { get; set; }
}

public class BankConsentCreateResult
{
    public bool Success { get; set; }
    public bool NotFound { get; set; }
    public string? Error { get; set; }
    public string? Token { get; set; }
    public string? BrokerSlug { get; set; }
    public BankConsentInfo? Request { get; set; }
}

public class BankConsentPublicView
{
    public string Status { get; set; } = null!;
    public string BankName { get; set; } = null!;
    public string? Title { get; set; }
    public string? Body { get; set; }
    public string? FullName { get; set; }
    public string? Telefon { get; set; }
    public string? Email { get; set; }
    public DateTime? SignedAt { get; set; }
}

public class BankConsentSignResult
{
    public bool Success { get; set; }
    public bool NotFound { get; set; }
    public string? Error { get; set; }
}
