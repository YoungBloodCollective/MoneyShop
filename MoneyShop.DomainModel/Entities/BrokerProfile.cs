using System;

namespace MoneyShop.DomainModel.Entities
{
    public class BrokerProfile : IEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Slug { get; set; } = null!;
        public string DisplayName { get; set; } = null!;
        public string? PublicPhone { get; set; }
        public string? PublicEmail { get; set; }
        public string? NotificationEmail { get; set; }
        public string? Bio { get; set; }
        public string Status { get; set; } = "Active";
        public string Plan { get; set; } = "Partener";

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

        public bool ProCreditConsentEnabled { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual Utilizatori User { get; set; } = null!;
    }
}
