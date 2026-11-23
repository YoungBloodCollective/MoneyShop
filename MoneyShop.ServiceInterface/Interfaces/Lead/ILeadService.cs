using MoneyShop.DomainModel.Entities;

namespace MoneyShop.ServiceInterface.Interfaces.Lead
{
    public interface ILeadService
    {
        /// <summary>Creates the lead for a booking unless that broker already has a lead with the same phone.</summary>
        Task<LeadFromAppointmentResult> CreateFromAppointmentAsync(Appointment appointment);

        /// <summary>A personal, time-limited link token for the acord of one lead (broker-scoped lookup).</summary>
        Task<LeadAcordLink?> IssueAcordLinkAsync(int leadId);

        /// <summary>Name, phone and email behind a valid link token; null for anything else.</summary>
        Task<LeadAcordPrefill?> GetAcordPrefillAsync(string? token);

        /// <summary>
        /// After a client signed through the link: ties the lead to the client and marks it converted.
        /// An invalid token, a lead of another broker, a different phone or a lead already tied to another client changes nothing.
        /// </summary>
        Task<bool> LinkAcordAsync(string? token, Guid acordId);
    }

    public class LeadFromAppointmentResult
    {
        public LeadCapture Lead { get; set; } = null!;
        public bool Created { get; set; }
    }

    public class LeadAcordLink
    {
        public string Token { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public string? BrokerSlug { get; set; }
    }

    public class LeadAcordPrefill
    {
        public string Nume { get; set; } = "";
        public string Prenume { get; set; } = "";
        public string Telefon { get; set; } = "";
        public string Email { get; set; } = "";
    }
}
