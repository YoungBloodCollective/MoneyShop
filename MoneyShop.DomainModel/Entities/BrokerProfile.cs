using System;

namespace MoneyShop.DomainModel.Entities
{
    public static class BrokerTypes
    {
        public const string MoneyShop = "MoneyShop";
        public const string Afiliat = "Afiliat";

        public static bool IsValid(string? value) => value == MoneyShop || value == Afiliat;
    }

    public static class BrokerTargets
    {
        public const decimal DefaultNpAmount = 5_000_000m;
        public const decimal DefaultIpAmount = 5_000_000m;
        public const decimal DefaultCommissionAmount = 150_000m;
        public const decimal MaxAmount = 1_000_000_000m;
    }

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
        public string Type { get; set; } = BrokerTypes.Afiliat;

        public decimal TargetNpAmount { get; set; } = BrokerTargets.DefaultNpAmount;
        public decimal TargetIpAmount { get; set; } = BrokerTargets.DefaultIpAmount;
        public decimal TargetCommissionAmount { get; set; } = BrokerTargets.DefaultCommissionAmount;

        public string? FirmaNume { get; set; }
        public string? FirmaSediu { get; set; }
        public string? FirmaCui { get; set; }
        public string? FirmaRegCom { get; set; }
        public string? FirmaEuid { get; set; }
        public string? FirmaDataInfiintarii { get; set; }
        public string? ReprezentantNume { get; set; }
        public string? ReprezentantTelefon { get; set; }

        public string? Oras { get; set; }
        public string? Judet { get; set; }

        public string? TermsVersion { get; set; }
        public DateTime? TermsAcceptedAt { get; set; }
        public string? TermsAcceptedIp { get; set; }

        public bool MangoAgreementEnabled { get; set; }
        public string? MangoEmail { get; set; }

        /// <summary>
        /// Bancile partenere ale brokerului, separate prin virgula. Clientul semneaza
        /// pre-documentele lor odata cu acordul. Gol inseamna oprit.
        /// </summary>
        public string? BankPreDocuments { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual Utilizatori User { get; set; } = null!;
    }
}
