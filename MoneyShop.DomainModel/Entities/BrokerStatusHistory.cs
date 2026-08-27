using System.ComponentModel.DataAnnotations;

namespace MoneyShop.DomainModel.Entities;

public class BrokerStatusHistory
{
    public int Id { get; set; }
    public int BrokerDosarId { get; set; }
    [MaxLength(50)]
    public string StatusVechi { get; set; } = "";
    [MaxLength(50)]
    public string StatusNou { get; set; } = "";
    [MaxLength(500)]
    public string? Comentariu { get; set; }
    public int ChangedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public virtual BrokerDosar BrokerDosar { get; set; } = null!;
    public virtual Utilizatori ChangedByUser { get; set; } = null!;
}
