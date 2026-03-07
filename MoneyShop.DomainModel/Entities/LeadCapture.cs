using System;

namespace MoneyShop.DomainModel.Entities
{
    public class LeadCapture : IEntity
    {
        public int Id { get; set; }
        public int? UserId { get; set; }
        public string NumePrenume { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Oras { get; set; } = null!;

        public bool CrediteActive { get; set; }
        public decimal? SoldTotalAprox { get; set; }
        public string? TipCreditor { get; set; } // BANCA, IFN, LEASING, MIXT, NU_STIU

        public bool Intarzieri { get; set; }
        public int? IntarzieriNumarAprox { get; set; }
        public int? IntarzieriZileMax { get; set; } // 0, 30, 60, 90, 120

        public decimal VenitNetLunar { get; set; }
        public decimal? BonuriMasaAprox { get; set; }

        public bool PoprireSauExecutorUltimii5Ani { get; set; }
        public bool? SituatiePoprireInchisa { get; set; }

        public string Source { get; set; } = "api"; // api, chat_state_machine
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

