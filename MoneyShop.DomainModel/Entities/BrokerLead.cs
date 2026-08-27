using System.ComponentModel.DataAnnotations;

namespace MoneyShop.DomainModel.Entities;

public class BrokerLead
{
    public int Id { get; set; }
    public int BrokerProfileId { get; set; }
    [MaxLength(255)]
    public string Nume { get; set; } = "";
    [MaxLength(255)]
    public string? Prenume { get; set; }
    [MaxLength(20)]
    public string Telefon { get; set; } = "";
    [MaxLength(255)]
    public string? Email { get; set; }
    [MaxLength(100)]
    public string? Judet { get; set; }
    [MaxLength(200)]
    public string? Oras { get; set; }
    [MaxLength(100)]
    public string? TipCredit { get; set; }
    public decimal? SalariuNet { get; set; }
    public decimal? SumaDorita { get; set; }
    [MaxLength(50)]
    public string Status { get; set; } = "Nou";
    [MaxLength(1000)]
    public string? Note { get; set; }
    [MaxLength(100)]
    public string? UtmSource { get; set; }
    [MaxLength(100)]
    public string? UtmMedium { get; set; }
    [MaxLength(100)]
    public string? UtmCampaign { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public virtual BrokerProfile BrokerProfile { get; set; } = null!;
    public virtual ICollection<BrokerDosar> Dosare { get; set; } = new List<BrokerDosar>();
}
