using System;

namespace MoneyShop.DomainModel.Entities
{
    public static class ReferralModes
    {
        public const string Colaborare = "Colaborare";
        public const string Transfer = "Transfer";
        public const int ColaborareSharePercent = 50;

        public static bool IsValid(string? value) => value == Colaborare || value == Transfer;
    }

    public static class ReferralStatuses
    {
        public const string AsteaptaClient = "AsteaptaClient";
        public const string Acceptat = "Acceptat";
        public const string Refuzat = "Refuzat";
        public const string Expirat = "Expirat";
        public const string Anulat = "Anulat";
    }

    /// <summary>
    /// A broker handing a client to another broker. It belongs to two brokers, so it has no broker
    /// query filter: every read goes through the referral service, which checks the caller's side.
    /// The client's consent (token hash, time, IP, user agent) is the only thing that lets the
    /// receiving broker get the client's contact data, as a new lead.
    /// </summary>
    public class ClientReferral : IEntity
    {
        public int Id { get; set; }
        public int FromBrokerProfileId { get; set; }
        public int ToBrokerProfileId { get; set; }
        public int ClientUserId { get; set; }
        public string Mode { get; set; } = ReferralModes.Colaborare;
        public int SharePercent { get; set; }
        public string? Note { get; set; }
        public string Status { get; set; } = ReferralStatuses.AsteaptaClient;
        public string ConsentTokenHash { get; set; } = null!;
        public DateTime ConsentExpiresAt { get; set; }
        public DateTime? ConsentAt { get; set; }
        public string? ConsentIp { get; set; }
        public string? ConsentUserAgent { get; set; }
        public int? LeadId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual LeadCapture? Lead { get; set; }
    }
}
