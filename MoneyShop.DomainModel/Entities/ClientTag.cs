using System;

namespace MoneyShop.DomainModel.Entities
{
    /// <summary>A label the broker puts on a client to filter by it (Probleme BC, De revenit, DTI).</summary>
    public class ClientTag : IEntity, IBrokerOwned
    {
        public int Id { get; set; }
        public int? BrokerProfileId { get; set; }
        public int UserId { get; set; }
        public string Tag { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }
}
