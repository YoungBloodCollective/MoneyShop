namespace MoneyShop.ServiceInterface.Dtos.Lead
{
    public class LeadCaptureRequest
    {
        public string NumePrenume { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Oras { get; set; } = null!;

        public bool CrediteActive { get; set; }
        public decimal? SoldTotalAprox { get; set; }
        public string? TipCreditor { get; set; }

        public bool Intarzieri { get; set; }
        public int? IntarzieriNumarAprox { get; set; }
        public int? IntarzieriZileMax { get; set; }

        public decimal VenitNetLunar { get; set; }
        public decimal? BonuriMasaAprox { get; set; }

        public bool PoprireSauExecutorUltimii5Ani { get; set; }
        public bool? SituatiePoprireInchisa { get; set; }
    }

    public class LeadCaptureResponse
    {
        public int LeadId { get; set; }
        public string Status { get; set; } = null!;
        public string Mesaj { get; set; } = null!;
    }

    public class LeadNextRequest
    {
        public string? ConversationId { get; set; }
        public string Action { get; set; } = "start";
        public string? Answer { get; set; }
    }

    public class LeadNextResponse
    {
        public bool Done { get; set; }
        public int Step { get; set; }
        public int? LeadId { get; set; }
        public string Mesaj { get; set; } = null!;
    }

    public class LeadSessionData
    {
        public string? NumePrenume { get; set; }
        public string? Telefon { get; set; }
        public string? Email { get; set; }
        public string? Oras { get; set; }

        public bool? CrediteActive { get; set; }
        public decimal? SoldTotalAprox { get; set; }
        public string? TipCreditor { get; set; }

        public bool? Intarzieri { get; set; }
        public int? IntarzieriNumarAprox { get; set; }
        public int? IntarzieriZileMax { get; set; }

        public decimal? VenitNetLunar { get; set; }
        public decimal? BonuriMasaAprox { get; set; }

        public bool? PoprireSauExecutorUltimii5Ani { get; set; }
        public bool? SituatiePoprireInchisa { get; set; }
    }
}
