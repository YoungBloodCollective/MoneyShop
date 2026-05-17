namespace MoneyShop.DomainModel.Entities
{
    public class PartnerApplication : IEntity
    {
        public int Id { get; set; }
        public string Nume { get; set; } = null!;
        public string Prenume { get; set; } = null!;
        public string Telefon { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Judet { get; set; } = null!;
        public string Descriere { get; set; } = null!;
        public string Status { get; set; } = "Nou";
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
