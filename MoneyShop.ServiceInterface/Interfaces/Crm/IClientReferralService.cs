using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MoneyShop.ServiceInterface.Interfaces.Crm
{
    /// <summary>
    /// A broker hands a client to another broker, as a collaboration (the referrer keeps seeing the
    /// progress and gets a share of the commission) or as a transfer. The client's consent, given on a
    /// private link, is what releases the contact data (name, phone, email) to the receiving broker, as a
    /// lead; no documents or identity data ever move. Everything is limited to the signed-in broker's side
    /// of the referral; the Super Admin (no broker scope) sees all.
    /// </summary>
    public interface IClientReferralService
    {
        /// <summary>Active brokers other than the caller, matched by name or city: id, name, city, county, type and nothing else.</summary>
        List<BrokerDirectoryItem> SearchBrokers(string? q, string? oras, string? judet);

        Task<ReferralCreateResult> CreateAsync(int clientUserId, ReferralCreateInput input);

        ReferralOverview GetOverview();

        ReferralActionResult Cancel(int referralId);

        ReferralConsentPreviewResult PreviewConsent(string? token);

        Task<ReferralRespondResult> RespondAsync(string? token, bool accept, string? ip, string? userAgent);

        /// <summary>For the lead list: the referring broker's name per lead that came through a referral (only leads the caller can see are asked about).</summary>
        Dictionary<int, string> ReceivedFromByLead(IEnumerable<int> leadIds);
    }

    /// <summary>Sends the messages of the referral flow. A failed send is reported, never thrown.</summary>
    public interface IReferralMessenger
    {
        Task<ReferralDelivery> SendConsentRequestAsync(ReferralConsentMessage message);
        Task<bool> NotifyReceivedAsync(string toEmail, string fromName, string clientName, string? phone, bool collaboration, string crmUrl);
        Task<bool> NotifyStatusAsync(string toEmail, string clientName, string bankName, string statusLabel);
    }

    /// <summary>Told by the bank-file work service when a file is added or changes stage.</summary>
    public interface IReferralNotifier
    {
        /// <summary>Emails the referring broker when the file belongs to a client who came through an accepted collaboration. Never throws.</summary>
        void BankFileChanged(int bankFileId);
    }

    public class BrokerDirectoryItem
    {
        public int Id { get; set; }
        public string DisplayName { get; set; } = null!;
        public string? Oras { get; set; }
        public string? Judet { get; set; }
        public string Type { get; set; } = null!;
    }

    public class ReferralCreateInput
    {
        public int? ToBrokerProfileId { get; set; }
        public string? Mode { get; set; }
        public string? Note { get; set; }
    }

    public enum ReferralError
    {
        None,
        NotBroker,
        InvalidMode,
        NoteTooLong,
        TargetNotFound,
        SelfReferral,
        ClientNotVisible,
        NoContact,
        NoPhone,
        TooManyForClient,
        Duplicate,
    }

    public class ReferralCreateResult
    {
        public ReferralError Error { get; set; }
        public ReferralItem? Referral { get; set; }
        public bool SmsSent { get; set; }
        public bool EmailSent { get; set; }
    }

    public class ReferralDelivery
    {
        public bool Sms { get; set; }
        public bool Email { get; set; }
    }

    public class ReferralConsentMessage
    {
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string ClientFirstName { get; set; } = "";
        public string FromName { get; set; } = null!;
        public string ToName { get; set; } = null!;
        public string? ToOras { get; set; }
        public bool Collaboration { get; set; }
        public string Url { get; set; } = null!;
    }

    public class ReferralFileItem
    {
        public string BankName { get; set; } = null!;
        public string? CreditType { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = null!;
        public DateTime StatusChangedAt { get; set; }
    }

    public class ReferralItem
    {
        public int Id { get; set; }
        public int FromBrokerProfileId { get; set; }
        public string FromBrokerName { get; set; } = null!;
        public int ToBrokerProfileId { get; set; }
        public string ToBrokerName { get; set; } = null!;
        public string? ToBrokerOras { get; set; }
        public int? ClientUserId { get; set; }
        public string? ClientName { get; set; }
        public string Mode { get; set; } = null!;
        public int SharePercent { get; set; }
        public string? Note { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime ConsentExpiresAt { get; set; }
        public DateTime? ConsentAt { get; set; }
        public bool CanCancel { get; set; }
        /// <summary>The receiving broker's files for the client; only for an accepted collaboration, only to the referrer and the Super Admin.</summary>
        public List<ReferralFileItem>? Files { get; set; }
        /// <summary>SharePercent of the estimated commission of the receiver's disbursed files, for an accepted collaboration.</summary>
        public decimal? ShareAmount { get; set; }
    }

    public class ReferralOverview
    {
        public List<ReferralItem> Sent { get; set; } = new();
        public List<ReferralItem> Received { get; set; } = new();
        /// <summary>Set only for the Super Admin (no broker scope).</summary>
        public List<ReferralItem>? All { get; set; }
    }

    public class ReferralActionResult
    {
        public bool Success { get; set; }
        public bool NotFound { get; set; }
        public string? Message { get; set; }
    }

    public enum ReferralConsentError
    {
        None,
        NotFound,
        Expired,
        Answered,
        Cancelled,
    }

    public class ReferralConsentView
    {
        public string FromName { get; set; } = null!;
        public string ToName { get; set; } = null!;
        public string? ToOras { get; set; }
        public string Mode { get; set; } = null!;
        public int SharePercent { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class ReferralConsentPreviewResult
    {
        public ReferralConsentError Error { get; set; }
        public ReferralConsentView? View { get; set; }
    }

    public class ReferralRespondResult
    {
        public ReferralConsentError Error { get; set; }
        public bool Accepted { get; set; }
        public ReferralConsentView? View { get; set; }
    }
}
