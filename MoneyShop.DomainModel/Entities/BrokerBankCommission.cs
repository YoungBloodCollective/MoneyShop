using System;

namespace MoneyShop.DomainModel.Entities
{
    /// <summary>
    /// The commission percent a broker negotiated with a bank for a credit type (NP or IP), overriding the bank's default.
    /// A row without a credit type predates the NP/IP split and applies to both until the broker sets one of them.
    /// </summary>
    public class BrokerBankCommission : IEntity
    {
        public int Id { get; set; }
        public int BrokerProfileId { get; set; }
        public int BankId { get; set; }
        public string? CreditType { get; set; }
        public decimal CommissionPercent { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
