using System.ComponentModel.DataAnnotations;

namespace MoneyShop.DomainModel.Entities;

public class BrokerDocument
{
    public int Id { get; set; }
    public int BrokerDosarId { get; set; }
    [MaxLength(100)]
    public string Categorie { get; set; } = "Altele";
    [MaxLength(255)]
    public string FileName { get; set; } = "";
    [MaxLength(100)]
    public string MimeType { get; set; } = "";
    [MaxLength(1000)]
    public string? AzureBlobPath { get; set; }
    [MaxLength(500)]
    public string? Note { get; set; }
    public long FileSizeBytes { get; set; }
    public int UploadedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public virtual BrokerDosar BrokerDosar { get; set; } = null!;
    public virtual Utilizatori UploadedByUser { get; set; } = null!;
}
