namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>The broker's disbursed NP / IP volume and estimated commission this month against the personal targets.</summary>
    public interface ICrmTargetsService
    {
        /// <summary>Null when the caller has no broker profile.</summary>
        BrokerTargetsResult? GetMine(int userId);
    }

    public class TargetProgress
    {
        public decimal Achieved { get; set; }
        public decimal Target { get; set; }
    }

    public class BrokerTargetsResult
    {
        public string Month { get; set; } = null!;
        public TargetProgress Np { get; set; } = new();
        public TargetProgress Ip { get; set; } = new();
        public TargetProgress Commission { get; set; } = new();
    }
}
