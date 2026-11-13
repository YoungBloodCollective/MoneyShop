namespace MoneyShop.ServiceInterface.Interfaces.Acord;

/// <summary>
/// Bank consent links: from a signed acord, a broker generates a link to one bank's own
/// forms, filled with the client's data; the client reads and signs them in one go, and
/// the signed PDFs are kept on the acord for the broker to download.
/// </summary>
public interface IBankConsentService
{
    List<BankConsentBank> ListBanks();
    List<BankConsentInfo> ListForAcord(Guid acordId);
    BankConsentCreateResult CreateForAcord(Guid acordId, string bankCode, int? createdByUserId);

    BankConsentPublicView? GetByToken(string token);

    /// <summary>
    /// The filled but unsigned form, so the client reads the real document before signing.
    /// </summary>
    BankConsentDocumentFile? GetDocumentByToken(string token, string documentCode);

    BankConsentDocumentFile? GenerateCodebitorForm(Guid acordId, string? relation, int? actorUserId, string? actorRole = null, string? ip = null, string? userAgent = null);

    BankConsentSignResult Sign(string token, byte[] signaturePng, BankConsentSignInput input, string? ip, string? userAgent);
}

public class BankConsentSignInput
{
    public string? Cnp { get; set; }
    public string? Address { get; set; }
    public string? BirthDate { get; set; }
}

public class BankConsentBank
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public int DocumentCount { get; set; }
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
    public string? FullName { get; set; }
    public string? Telefon { get; set; }
    public string? Email { get; set; }

    /// <summary>
    /// Set when one of the bank's forms asks for a CNP the platform does not keep.
    /// </summary>
    public bool RequiresCnp { get; set; }

    /// <summary>
    /// The last four digits the acord recorded, so the page can check what the client types.
    /// </summary>
    public string? CnpHint { get; set; }

    /// <summary>
    /// Set when a form prints the client's domicile. The ID card reading misses it on about
    /// a quarter of the acords, so the client confirms or completes what we read.
    /// </summary>
    public bool RequiresAddress { get; set; }
    public string? Address { get; set; }

    /// <summary>
    /// Set when a form prints the client's birth date, which the ID card reading misses on
    /// about half the acords.
    /// </summary>
    public bool RequiresBirthDate { get; set; }
    public string? BirthDate { get; set; }

    public List<BankConsentDocumentView> Documents { get; set; } = new();
    public DateTime? SignedAt { get; set; }
}

public class BankConsentDocumentView
{
    public string Code { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Summary { get; set; } = null!;
}

public class BankConsentDocumentFile
{
    public string FileName { get; set; } = null!;
    public byte[] Content { get; set; } = null!;
}

public class BankConsentSignResult
{
    public bool Success { get; set; }
    public bool NotFound { get; set; }
    public string? Error { get; set; }
}
