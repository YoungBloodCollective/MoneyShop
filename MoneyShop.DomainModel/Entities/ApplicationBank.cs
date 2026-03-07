using MoneyShop.DomainModel;


namespace MoneyShop.DomainModel.Entities
{
    public partial class ApplicationBank : IEntity
    {
        public int Id { get; set; }
        public int ApplicationId { get; set; }
        public int BankId { get; set; }
        public decimal CommissionPercent { get; set; }

        // Navigation properties
        public virtual Application Application { get; set; } = null!;
        public virtual Bank Bank { get; set; } = null!;
    }
}

