using System.ComponentModel.DataAnnotations;

namespace MoneyShop.DomainModel.Entities;

public class BrokerNotification
{
    public int Id { get; set; }
    public int BrokerProfileId { get; set; }
    [MaxLength(50)]
    public string Type { get; set; } = "Info";
    [MaxLength(255)]
    public string Title { get; set; } = "";
    [MaxLength(1000)]
    public string Message { get; set; } = "";
    public bool IsRead { get; set; } = false;
    public int? RelatedEntityId { get; set; }
    [MaxLength(50)]
    public string? RelatedEntityType { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public virtual BrokerProfile BrokerProfile { get; set; } = null!;
}
