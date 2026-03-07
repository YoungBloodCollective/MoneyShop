using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class BrokerDirectory : IEntity
    {
        public int Id { get; set; }
        public string ExcelFileName { get; set; } = null!;
        public string BlobPath { get; set; } = null!; // Path to Excel file in blob storage
        public long FileSize { get; set; }
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public int UploadedByUserId { get; set; }
        public string? Notes { get; set; }

        // Navigation
        public virtual Utilizatori UploadedByUser { get; set; } = null!;
    }
}

