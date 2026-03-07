using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class Agreement : IEntity
    {
        public int Id { get; set; }
        public int ApplicationId { get; set; }
        public string AgreementType { get; set; } = null!; 
        // "acord_marketing", "consimtamant_gdpr", "acord_intermediere", "mandat_brokeraj", "mandat_kingstone"
        public string PdfBlobPath { get; set; } = null!;
        public string Version { get; set; } = "1.0";
        public DateTime? SignedAt { get; set; }
        public string? SignatureImagePath { get; set; } // Path to signature image in blob
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual Application Application { get; set; } = null!;
    }
}

