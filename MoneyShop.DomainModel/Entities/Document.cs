using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class Document : IEntity
    {
        public int Id { get; set; }
        public int ApplicationId { get; set; }
        public string DocType { get; set; } = null!; // "CI", "Fluturas", "ExtrasCont", etc.
        public string AzureBlobPath { get; set; } = null!;
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public string? MimeType { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual Application Application { get; set; } = null!;
    }
}

