namespace MoneyShop.ServiceInterface.Interfaces.Broker;

public interface IBrokerProfileService
{
    BrokerPublicProfile? GetPublicProfile(string slug);

    /// <summary>
    /// The broker a public submission belongs to: the active broker behind the slug
    /// (subdomain), or the platform's default broker when no slug is sent. A slug
    /// that matches no active broker resolves to null.
    /// </summary>
    int? ResolveIntakeBrokerId(string? slug);

    BrokerLegalIdentity? GetLegalIdentity(int? brokerProfileId);
    string? GetNotificationEmail(int? brokerProfileId);
    Dictionary<int, string> GetDisplayNames();

    BrokerProfileView? GetForUser(int userId);
    BrokerSaveResult UpdateOwn(int userId, BrokerSelfUpdateInput input);

    List<BrokerAdminItem> ListForAdmin();
    BrokerProfileView? GetForAdmin(int id);
    BrokerSaveResult Create(BrokerCreateInput input);
    BrokerSaveResult Update(int id, BrokerAdminUpdateInput input);
    BrokerSaveResult SetPassword(int id, string password);
}

public class BrokerPublicProfile
{
    public string Slug { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Bio { get; set; }
    public bool AcordAvailable { get; set; }
    public bool MangoAgreementEnabled { get; set; }
}

public class BrokerLegalIdentity
{
    public int BrokerProfileId { get; set; }
    public string Slug { get; set; } = null!;
    public string FirmaNume { get; set; } = null!;
    public string FirmaSediu { get; set; } = null!;
    public string FirmaCui { get; set; } = null!;
    public string FirmaRegCom { get; set; } = null!;
    public string FirmaEuid { get; set; } = null!;
    public string FirmaDataInfiintarii { get; set; } = null!;
    public string ReprezentantNume { get; set; } = null!;
    public string ReprezentantTelefon { get; set; } = null!;
    public bool MangoAgreementEnabled { get; set; }
    public string? MangoEmail { get; set; }
}

public class BrokerProfileView
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Slug { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string? PublicPhone { get; set; }
    public string? PublicEmail { get; set; }
    public string? NotificationEmail { get; set; }
    public string? Bio { get; set; }
    public string Status { get; set; } = null!;
    public string Plan { get; set; } = null!;
    public string LoginEmail { get; set; } = null!;
    public string? LoginPhone { get; set; }
    public bool HasPassword { get; set; }
    public string? FirmaNume { get; set; }
    public string? FirmaSediu { get; set; }
    public string? FirmaCui { get; set; }
    public string? FirmaRegCom { get; set; }
    public string? FirmaEuid { get; set; }
    public string? FirmaDataInfiintarii { get; set; }
    public string? ReprezentantNume { get; set; }
    public string? ReprezentantTelefon { get; set; }
    public bool MangoAgreementEnabled { get; set; }
    public string? MangoEmail { get; set; }
    public bool AcordAvailable { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BrokerAdminItem
{
    public int Id { get; set; }
    public string Slug { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string LoginEmail { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string Plan { get; set; } = null!;
    public bool AcordAvailable { get; set; }
    public int Acorduri { get; set; }
    public int Programari { get; set; }
    public int Cereri { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class BrokerSelfUpdateInput
{
    public string? DisplayName { get; set; }
    public string? PublicPhone { get; set; }
    public string? PublicEmail { get; set; }
    public string? NotificationEmail { get; set; }
    public string? Bio { get; set; }
}

public class BrokerAdminUpdateInput : BrokerSelfUpdateInput
{
    public string? Slug { get; set; }
    public string? Status { get; set; }
    public string? Plan { get; set; }
    public string? FirmaNume { get; set; }
    public string? FirmaSediu { get; set; }
    public string? FirmaCui { get; set; }
    public string? FirmaRegCom { get; set; }
    public string? FirmaEuid { get; set; }
    public string? FirmaDataInfiintarii { get; set; }
    public string? ReprezentantNume { get; set; }
    public string? ReprezentantTelefon { get; set; }
    public bool? MangoAgreementEnabled { get; set; }
    public string? MangoEmail { get; set; }
}

public class BrokerCreateInput : BrokerAdminUpdateInput
{
    public string Nume { get; set; } = null!;
    public string Prenume { get; set; } = null!;
    public string LoginEmail { get; set; } = null!;
    public string? LoginPhone { get; set; }
    public string? Password { get; set; }
}

public class BrokerSaveResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public int? Id { get; set; }

    public static BrokerSaveResult Ok(int id) => new() { Success = true, Id = id };
    public static BrokerSaveResult Fail(string error) => new() { Success = false, Error = error };
}
