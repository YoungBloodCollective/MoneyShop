using System;

namespace MoneyShop.DomainModel.Entities
{
    /// <summary>
    /// A loan file the broker submitted to a bank for a client, tracked through the bank's own
    /// stages (Trimis → Verificări → Analiză → Completări → Aprobat financiar → Aprobat final → Disbursat).
    /// </summary>
    public class BankFile : IEntity, IBrokerOwned
    {
        public int Id { get; set; }
        public int? BrokerProfileId { get; set; }
        public int UserId { get; set; }
        public int? BankId { get; set; }
        public string BankName { get; set; } = null!;
        /// <summary>NP (credit de nevoi personale) or IP (credit ipotecar).</summary>
        public string? CreditType { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = null!;
        public DateTime StatusChangedAt { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
