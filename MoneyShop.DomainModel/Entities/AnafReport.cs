using MoneyShop.DomainModel;


namespace MoneyShop.DomainModel.Entities
{
    public class AnafReport : IEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string ReportId { get; set; } = null!; // ID unic pentru raport
        public string? BlobPath { get; set; } // Path în Azure Blob Storage
        public string? FileContentBase64 { get; set; } // Conținut PDF base64
        public string? FileName { get; set; }
        
        // Date extrase (cached)
        public decimal? AvgNet6Months { get; set; }
        public decimal? AvgMeal6Months { get; set; }
        public int? PeriodMonths { get; set; } // Câte luni au fost găsite
        public string? ParseWarnings { get; set; } // JSON array cu warning-uri
        public string? ParserVersion { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ParsedAt { get; set; }
        
        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
    }
}

