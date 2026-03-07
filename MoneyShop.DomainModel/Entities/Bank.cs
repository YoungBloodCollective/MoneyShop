using MoneyShop.DomainModel;


namespace MoneyShop.DomainModel.Entities
{
    public partial class Bank : IEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public decimal CommissionPercent { get; set; }
        public bool Active { get; set; } = true;

        // Navigation property
        public virtual ICollection<ApplicationBank> ApplicationBanks { get; set; } = new List<ApplicationBank>();
    }
}

