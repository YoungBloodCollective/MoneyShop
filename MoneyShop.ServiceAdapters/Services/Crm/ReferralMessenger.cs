using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using MoneyShop.ServiceAdapters.Services.Otp;
using MoneyShop.ServiceInterface.Interfaces.Crm;

namespace MoneyShop.ServiceAdapters.Services.Crm
{
    /// <summary>The SMS and emails of the referral flow, over Brevo. Failures are reported as false, never thrown.</summary>
    public class ReferralMessenger : IReferralMessenger
    {
        private readonly EmailService _email;
        private readonly SmsService _sms;

        public ReferralMessenger(EmailService email, SmsService sms)
        {
            _email = email;
            _sms = sms;
        }

        private static readonly Regex UrlLike = new(@"(?:https?://|www\.)\S*|[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}\S*", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        private static readonly Regex ControlChars = new(@"[\p{C}\p{Zl}\p{Zp}]+", RegexOptions.Compiled);

        public async Task<ReferralDelivery> SendConsentRequestAsync(ReferralConsentMessage message)
        {
            message.FromName = SafeName(message.FromName);
            message.ToName = SafeName(message.ToName);
            var delivery = new ReferralDelivery();
            var phone = InternationalPhone(message.Phone);
            if (phone != null)
            {
                var sms = $"MoneyShop: {message.FromName} iti recomanda pe {message.ToName} pentru creditul tau. "
                          + (message.Collaboration ? $"{message.FromName} va fi tinut la curent cu dosarul. " : "")
                          + $"Esti de acord sa-i transmitem numele, telefonul si emailul tau? Raspunde aici: {message.Url}";
                delivery.Sms = await _sms.SendTextAsync(phone, sms);
            }
            if (!string.IsNullOrWhiteSpace(message.Email))
            {
                delivery.Email = await _email.SendReferralConsentAsync(message.Email!, message.ClientFirstName, message.FromName, message.ToName, message.ToOras, message.Collaboration, message.Url);
            }
            return delivery;
        }

        public Task<bool> NotifyReceivedAsync(string toEmail, string fromName, string clientName, string? phone, bool collaboration, string crmUrl) =>
            _email.SendReferralReceivedAsync(toEmail, SafeName(fromName), clientName, phone, collaboration, crmUrl);

        public Task<bool> NotifyStatusAsync(string toEmail, string clientName, string bankName, string statusLabel) =>
            _email.SendReferralStatusAsync(toEmail, clientName, bankName, statusLabel);

        /// <summary>A broker's display name is free text and goes into SMS and emails to a third party: no links, no control characters, at most 60 characters.</summary>
        internal static string SafeName(string? name)
        {
            var clean = ControlChars.Replace(name ?? "", " ");
            clean = UrlLike.Replace(clean, " ");
            clean = Regex.Replace(clean, @"\s+", " ").Trim();
            if (clean.Length > 60) clean = clean.Substring(0, 60).TrimEnd();
            return clean.Length == 0 ? "un coleg" : clean;
        }

        /// <summary>07xxxxxxxx (or +40 / 0040 forms) as 407xxxxxxxx; null when it does not look like a Romanian number.</summary>
        internal static string? InternationalPhone(string? phone)
        {
            var digits = new string((phone ?? "").Where(char.IsDigit).ToArray());
            if (digits.StartsWith("0040")) digits = digits.Substring(2);
            else if (digits.StartsWith("0") && digits.Length == 10) digits = "4" + digits;
            return digits.StartsWith("40") && digits.Length == 11 ? digits : null;
        }
    }
}
