using MoneyShop.DomainModel;
using System;
using System.Collections.Generic;


namespace MoneyShop.DomainModel.Entities
{
    public partial class Application : IEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Status { get; set; } = "INREGISTRAT";
        public string? TypeCredit { get; set; } // "ipotecar", "nevoi_personale", "refinantare"
        public string? TipOperatiune { get; set; } // "nou" sau "refinantare"

        // Loan request details (from frontend wizard)
        public decimal? RequestedAmount { get; set; }
        public int? RequestedTermMonths { get; set; }
        public string? Purpose { get; set; }

        // Date financiare
        public decimal? SalariuNet { get; set; }
        public bool? BonuriMasa { get; set; }
        public decimal? SumaBonuriMasa { get; set; }
        public int? VechimeLuni { get; set; }
        public int? NrCrediteBanci { get; set; }
        public string? ListaBanciActive { get; set; } // JSON array
        public int? NrIfn { get; set; }
        public bool? Poprire { get; set; }
        public decimal? SoldTotal { get; set; }
        public bool? Intarzieri { get; set; }
        public int? IntarzieriNumar { get; set; }
        
        // Carduri de credit și descoperit
        public string? CardCredit { get; set; } // JSON array
        public string? Overdraft { get; set; } // JSON array
        
        // Codebitori
        public string? Codebitori { get; set; } // JSON array
        
        // Scoring
        public decimal? Scoring { get; set; }
        public decimal? Dti { get; set; }
        public string? RecommendedLevel { get; set; }
        
        // Date bancă (completate de admin)
        public decimal? SumaAprobata { get; set; }
        public decimal? Comision { get; set; }
        public DateTime? DataDisbursare { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual Utilizatori User { get; set; } = null!;
        public virtual ICollection<Document> Documents { get; set; } = new List<Document>();
        public virtual ICollection<Agreement> Agreements { get; set; } = new List<Agreement>();
        public virtual ICollection<ApplicationBank> ApplicationBanks { get; set; } = new List<ApplicationBank>();
    }
}

