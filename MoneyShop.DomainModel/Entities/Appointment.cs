using System;

namespace MoneyShop.DomainModel.Entities
{
    public class Appointment : IEntity, IBrokerOwned
    {
        public int? BrokerProfileId { get; set; }
        public int Id { get; set; }
        public string Nume { get; set; } = null!;
        public string Prenume { get; set; } = null!;
        public string Judet { get; set; } = null!;
        public string TipCredit { get; set; } = null!;
        public decimal SalariuNet { get; set; }
        public string Telefon { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Status { get; set; } = "Nou";
        public string? Notes { get; set; }
        public string? IntarzieriBirou { get; set; }
        public string? PopriRecuperare { get; set; }

        /// <summary>Start of the call/meeting (UTC). Null = callback request not scheduled yet.</summary>
        public DateTime? ScheduledAt { get; set; }
        public int DurationMinutes { get; set; } = 15;
        /// <summary>site, manual (created in the CRM) …</summary>
        public string? Source { get; set; }
        public int? CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
