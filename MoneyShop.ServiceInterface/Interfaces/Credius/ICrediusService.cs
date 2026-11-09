using System.Threading.Tasks;

namespace MoneyShop.ServiceInterface.Interfaces.Credius
{
    /// <summary>
    /// Forwards a client lead to the Credius partner API. The integration is config-driven
    /// (Credius:BaseUrl / Credius:ApiKey / Credius:LeadEndpoint as app settings) — no secret
    /// ever lives in source. Until it is configured, forwarding is a no-op that says so.
    /// </summary>
    public interface ICrediusService
    {
        bool IsConfigured { get; }
        Task<CrediusForwardResult> ForwardLeadAsync(CrediusLeadInput input);
    }

    public class CrediusLeadInput
    {
        public string Nume { get; set; } = null!;
        public string? Prenume { get; set; }
        public string? Telefon { get; set; }
        public string? Email { get; set; }
        public decimal? SumaSolicitata { get; set; }
        public string? TipCredit { get; set; }
        /// <summary>Our own reference so Credius callbacks can be tied back to the application.</summary>
        public string? PartnerReference { get; set; }
    }

    public class CrediusForwardResult
    {
        public bool Configured { get; set; }
        public bool Success { get; set; }
        public int StatusCode { get; set; }
        public string Message { get; set; } = null!;
        public string? RawResponse { get; set; }
    }
}
