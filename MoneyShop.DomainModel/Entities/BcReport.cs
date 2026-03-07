using MoneyShop.DomainModel;


namespace MoneyShop.DomainModel.Entities
{
    public class BcReport : IEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string ReportId { get; set; } = null!; // ID unic pentru raport
        public string? BlobPath { get; set; } // Path în Azure Blob Storage
        public string? FileContentBase64 { get; set; } // Conținut PDF base64
        public string? FileName { get; set; }
        
        // Date extrase (cached)
        public int? FicoScore { get; set; }
        public decimal? ExistingMonthlyObligations { get; set; }
        
        // DPD (Days Past Due) în ultimii 4 ani
        public int? Dpd30Count { get; set; }
        public int? Dpd60Count { get; set; }
        public int? Dpd90PlusCount { get; set; }
        
        // IFN / Non-Bancari
        public int? NonbankClosedLast4Years { get; set; }
        public int? NonbankActiveNow { get; set; }
        
        public string? ParseWarnings { get; set; } // JSON array cu warning-uri
        public string? ParserVersion { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ParsedAt { get; set; }
        
        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
    }
}

