using MoneyShop.DomainModel;
using System;


namespace MoneyShop.DomainModel.Entities
{
    public partial class AcordClient : IEntity
    {
        public Guid AcordId { get; set; } = Guid.NewGuid();
        public int UserId { get; set; }
        public Guid? KycId { get; set; }
        public string Token { get; set; } = null!;

        public string Nume { get; set; } = null!;
        public string Prenume { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string? Email { get; set; }
        public string? AgentCode { get; set; }
        public string? CreatedIp { get; set; }

        public string Status { get; set; } = "started"; // started, documents, signed, completed, rejected

        public string? TipAct { get; set; }
        public bool? IdIsNewFormat { get; set; }
        public string? OcrDataJson { get; set; }
        public bool RequiresProofOfAddress { get; set; }
        public bool HasIdFront { get; set; }
        public bool HasIdBack { get; set; }
        public bool HasProofOfAddress { get; set; }
        public bool HasSelfie { get; set; }

        public bool? LivenessPassed { get; set; }
        public decimal? LivenessConfidence { get; set; }
        public bool? FaceMatchPassed { get; set; }
        public decimal? FaceMatchConfidence { get; set; }
        public string? ReviewNote { get; set; }

        public Guid? ConsentId { get; set; }
        public DateTime? SignedAt { get; set; }
        public string? ConsentVersion { get; set; }
        public bool? MarketingAccepted { get; set; }
        public bool? Oug52Waived { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        // Navigation
        public virtual Utilizatori User { get; set; } = null!;
        public virtual KycSession? KycSession { get; set; }
    }
}
