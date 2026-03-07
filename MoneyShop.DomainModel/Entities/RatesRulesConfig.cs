using MoneyShop.DomainModel;


namespace MoneyShop.DomainModel.Entities
{
    public class RatesRulesConfig : IEntity
    {
        public int Id { get; set; }
        public string Version { get; set; } = null!;
        public string ConfigJson { get; set; } = null!; // JSON cu toată configurația
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}

