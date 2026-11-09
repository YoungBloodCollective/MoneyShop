namespace MoneyShop.ServiceInterface.Interfaces.Retention
{
    public interface IRetentionSweeper
    {
        Task<RetentionSweepResult> SweepAsync(CancellationToken cancellationToken = default);
    }

    public class RetentionSweepResult
    {
        public bool Skipped { get; set; }
        public int? RunId { get; set; }
        public string Status { get; set; } = "succeeded";
        public string? Error { get; set; }
        public RetentionSweepSummary Summary { get; set; } = new();
    }

    public class RetentionSweepSummary
    {
        public int KycFilesErased { get; set; }
        public int KycSessionsMasked { get; set; }
        public int AcordsPurged { get; set; }
        public int OtpDeleted { get; set; }
        public int SessionsDeleted { get; set; }
        public int LeadSessionsDeleted { get; set; }
        public int BcReportsErased { get; set; }
    }
}
