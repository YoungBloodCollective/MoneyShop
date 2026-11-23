using MoneyShop.DomainModel;


namespace MoneyShop.DomainModel.Entities
{
    public partial class Bank : IEntity
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public decimal CommissionPercent { get; set; }
        public bool Active { get; set; } = true;
        /// <summary>The bank's monthly disbursed-volume threshold (prag), in RON.</summary>
        public decimal? MonthlyThresholdAmount { get; set; }
        public int SortOrder { get; set; }

        // Navigation property
        public virtual ICollection<ApplicationBank> ApplicationBanks { get; set; } = new List<ApplicationBank>();
    }
}

