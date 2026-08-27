using System.ComponentModel.DataAnnotations;

namespace MoneyShop.DomainModel.Entities;

public class BrokerDosar
{
    public int Id { get; set; }
    public int BrokerProfileId { get; set; }
    public int? BrokerLeadId { get; set; }
    [MaxLength(255)]
    public string NumeClient { get; set; } = "";
    [MaxLength(20)]
    public string TelefonClient { get; set; } = "";
    [MaxLength(255)]
    public string? EmailClient { get; set; }
    [MaxLength(100)]
    public string TipCredit { get; set; } = "Personal";
    [MaxLength(255)]
    public string? BancaTinta { get; set; }
    public decimal? SumaSolicitata { get; set; }
    public int? DurataMasuri { get; set; }
    public decimal? RataLunaraEstimata { get; set; }
    [MaxLength(50)]
    public string Status { get; set; } = "Nou";
    [MaxLength(2000)]
    public string? Note { get; set; }
    public DateTime? TermenLimita { get; set; }
    [MaxLength(500)]
    public string? RezultatBanca { get; set; }
    public decimal? SumaAprobata { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public virtual BrokerProfile BrokerProfile { get; set; } = null!;
    public virtual BrokerLead? BrokerLead { get; set; }
    public virtual ICollection<BrokerDocument> Documents { get; set; } = new List<BrokerDocument>();
    public virtual ICollection<BrokerStatusHistory> StatusHistory { get; set; } = new List<BrokerStatusHistory>();
}
