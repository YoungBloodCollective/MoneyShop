using System;

namespace MoneyShop.DomainModel.Entities
{
    /// <summary>The commission percent a broker negotiated with a bank, overriding the bank's default.</summary>
    public class BrokerBankCommission : IEntity
    {
        public int Id { get; set; }
        public int BrokerProfileId { get; set; }
        public int BankId { get; set; }
        public decimal CommissionPercent { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
