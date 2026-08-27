using System.ComponentModel.DataAnnotations;

namespace MoneyShop.DomainModel.Entities;

public class BrokerProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    [MaxLength(100)]
    public string Slug { get; set; } = "";
    [MaxLength(500)]
    public string? Bio { get; set; }
    [MaxLength(255)]
    public string? PhotoUrl { get; set; }
    [MaxLength(50)]
    public string Plan { get; set; } = "Trial";
    [MaxLength(20)]
    public string Status { get; set; } = "Pending";
    public bool IsActive { get; set; } = false;
    public DateTime? TrialEndsAt { get; set; }
    public DateTime? SubscriptionEndsAt { get; set; }
    public int AnafQueriesUsed { get; set; } = 0;
    public int BcQueriesUsed { get; set; } = 0;
    public int AnafQueriesLimit { get; set; } = 3;
    public int BcQueriesLimit { get; set; } = 2;
    [MaxLength(255)]
    public string? Firma { get; set; }
    [MaxLength(20)]
    public string? Cui { get; set; }
    [MaxLength(255)]
    public string? Website { get; set; }
    [MaxLength(100)]
    public string? Judet { get; set; }
    [MaxLength(200)]
    public string? Oras { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public virtual Utilizatori User { get; set; } = null!;
    public virtual ICollection<BrokerLead> Leads { get; set; } = new List<BrokerLead>();
    public virtual ICollection<BrokerDosar> Dosare { get; set; } = new List<BrokerDosar>();
    public virtual ICollection<BrokerNotification> Notifications { get; set; } = new List<BrokerNotification>();
}
