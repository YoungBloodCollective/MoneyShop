namespace MoneyShop.ServiceInterface.Interfaces.Broker;

public static class BrokerTerms
{
    public const string Version = "2026-11-24";
    public const string Title = "Termenii de utilizare a CRM-ului MoneyShop";

    public const string Body =
@"1. Rolul tău față de datele clienților
Rămâi operator al datelor clienților tăi și răspunzi de legalitatea prelucrării lor. Înainte să introduci sau să importi date ale unui client în CRM, te asiguri că ai acordul clientului, în forma cerută de lege.

2. Rolul MoneyShop
MoneyShop furnizează platforma CRM și prelucrează datele clienților tăi în numele tău, ca furnizor al platformei, doar pentru a-ți oferi serviciul și conform instrucțiunilor tale.

3. Statistici și oferte comerciale
MoneyShop poate folosi cifrele agregate ale activității tale (volume, numărul de credite, băncile folosite) pentru statistici ale rețelei și pentru oferte comerciale. Nu folosește niciodată datele clienților tăi în acest scop.

4. Confidențialitate
Datele din CRM, ale clienților și ale rețelei MoneyShop sunt confidențiale. Nu le dezvălui unor terți și le folosești doar pentru activitatea ta de intermediere.

5. Contul tău
Păstrezi parola în siguranță și răspunzi de activitatea făcută din contul tău. Contul poate fi suspendat dacă este folosit abuziv, de exemplu pentru date obținute fără acord, pentru spam sau împotriva acestor termeni.";

    public const int InviteLifetimeDays = 7;
}

public static class BrokerInviteStatuses
{
    public const string Pending = "pending";
    public const string Used = "used";
    public const string Expired = "expired";
    public const string Revoked = "revoked";
}

public enum BrokerInviteError
{
    None,
    NotFound,
    Expired,
    Used,
    Revoked,
    Invalid
}

public interface IBrokerInviteService
{
    BrokerInviteCreateResult Create(string? email, string? name, string? type, int createdByUserId, DateTime nowUtc);
    BrokerInviteCreateResult Resend(int id, DateTime nowUtc);
    BrokerInviteActionResult Revoke(int id, DateTime nowUtc);
    List<BrokerInviteItem> List(DateTime nowUtc);
    BrokerInvitePreviewResult Preview(string token, DateTime nowUtc);
    BrokerSlugCheck CheckSlug(string token, string? slug, DateTime nowUtc);
    BrokerInviteAcceptResult Accept(string token, BrokerInviteAcceptInput input, string? ip, DateTime nowUtc);
}

public class BrokerInviteItem
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;
    public string? Name { get; set; }
    public string Type { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}

public class BrokerInviteCreateResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public BrokerInviteItem? Invite { get; set; }
    public string? Token { get; set; }

    public static BrokerInviteCreateResult Ok(BrokerInviteItem invite, string token) => new() { Success = true, Invite = invite, Token = token };
    public static BrokerInviteCreateResult Fail(string error) => new() { Success = false, Error = error };
}

public class BrokerInviteActionResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public BrokerInviteItem? Invite { get; set; }

    public static BrokerInviteActionResult Ok(BrokerInviteItem invite) => new() { Success = true, Invite = invite };
    public static BrokerInviteActionResult Fail(string error) => new() { Success = false, Error = error };
}

public class BrokerInvitePreview
{
    public string Email { get; set; } = null!;
    public string? Name { get; set; }
    public string Type { get; set; } = null!;
}

public class BrokerInvitePreviewResult
{
    public BrokerInviteError Error { get; set; }
    public BrokerInvitePreview? Invite { get; set; }
}

public class BrokerSlugCheck
{
    public BrokerInviteError Error { get; set; }
    public bool Available { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class BrokerInviteAcceptInput
{
    public string? Nume { get; set; }
    public string? Prenume { get; set; }
    public string? Telefon { get; set; }
    public string? Password { get; set; }
    public string? PasswordConfirm { get; set; }
    public string? Oras { get; set; }
    public string? Judet { get; set; }
    public string? Slug { get; set; }
    public string? FirmaNume { get; set; }
    public string? FirmaCui { get; set; }
    public bool AcceptTerms { get; set; }
    public string? TermsVersion { get; set; }
}

public class BrokerInviteAcceptResult
{
    public BrokerInviteError InviteError { get; set; }
    public string? Error { get; set; }
    public string? Slug { get; set; }
    public int? BrokerProfileId { get; set; }
    public bool Success => InviteError == BrokerInviteError.None && Error == null;

    public static BrokerInviteAcceptResult Fail(string error) => new() { Error = error };
    public static BrokerInviteAcceptResult Rejected(BrokerInviteError error) => new() { InviteError = error };
    public static BrokerInviteAcceptResult Ok(string slug, int profileId) => new() { Slug = slug, BrokerProfileId = profileId };
}
