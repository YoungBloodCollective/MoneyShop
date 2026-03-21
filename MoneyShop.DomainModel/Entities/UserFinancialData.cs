using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class UserFinancialData : IEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        
        // Ultimele 3 salarii (introduse manual)
        public decimal? Salariu1 { get; set; }
        public decimal? Salariu2 { get; set; }
        public decimal? Salariu3 { get; set; }

        // Venituri
        public decimal? SalariuNet { get; set; } // Media celor 3 salarii
        public bool? BonuriMasa { get; set; }
        public decimal? SumaBonuriMasa { get; set; }
        public decimal? VenitTotal { get; set; } // Calculat: SalariuNet + BonuriMasa

        // FICO score (from BC Report)
        public int? FicoScore { get; set; }

        // Credite active (JSON array: [{name, remainingAmount, monthsLeft, monthlyPayment}])
        public string? CreditsJson { get; set; }

        // Credite existente (aggregate)
        public decimal? SoldTotal { get; set; }
        public decimal? RataTotalaLunara { get; set; } // Total rate lunare
        public int? NrCrediteBanci { get; set; }
        public int? NrIfn { get; set; }
        public bool? Poprire { get; set; }
        public bool? Intarzieri { get; set; }
        public int? IntarzieriNumar { get; set; }
        
        // DTI (Debt-to-Income)
        public decimal? Dti { get; set; }
        
        // Scoring
        public string? ScoringLevel { get; set; }
        public string? RecommendedLevel { get; set; }
        
        // Metadata
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
    }
}

