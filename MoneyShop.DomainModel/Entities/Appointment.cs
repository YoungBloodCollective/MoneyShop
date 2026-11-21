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

        /// <summary>SHA-256 (hex) of the private link sent to the client to confirm / move / cancel.</summary>
        [System.Text.Json.Serialization.JsonIgnore]
        public string? ConfirmationTokenHash { get; set; }
        /// <summary>When the client confirmed a time booked on the site (UTC). Null = not confirmed yet.</summary>
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public DateTime? Reminder24hSentAt { get; set; }
        public DateTime? Reminder30mSentAt { get; set; }
        /// <summary>Google Ads click id of the visit that sent the request (only with marketing consent).</summary>
        public string? Gclid { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
