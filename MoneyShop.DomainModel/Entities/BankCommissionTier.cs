namespace MoneyShop.DomainModel.Entities
{
    /// <summary>
    /// A commission tier of a bank for one credit type (NP or IP): when the monthly network volume is
    /// in [FromAmount, ToAmount), the percent applies to the whole amount of every MoneyShop file.
    /// A null ToAmount means no upper limit.
    /// </summary>
    public class BankCommissionTier : IEntity
    {
        public int Id { get; set; }
        public int BankId { get; set; }
        public string CreditType { get; set; } = null!;
        public decimal FromAmount { get; set; }
        public decimal? ToAmount { get; set; }
        public decimal Percent { get; set; }
    }
}
