using System;

namespace MoneyShop.DomainModel.Entities
{
    /// <summary>A to-do the broker sets on a client ("sună-l joi"), with a reminder at <see cref="DueAt"/>.</summary>
    public class ClientTask : IEntity, IBrokerOwned
    {
        public int Id { get; set; }
        public int? BrokerProfileId { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = null!;
        /// <summary>When the broker wants to be reminded (UTC).</summary>
        public DateTime DueAt { get; set; }
        public DateTime? DoneAt { get; set; }
        /// <summary>Set once the reminder email went out, so it is sent only once.</summary>
        public DateTime? ReminderSentAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
