namespace MoneyShop.ServiceInterface.Interfaces.Broker
{
    public interface IBrokerDirectoryService
    {
        BrokerDirectoryUploadResult UploadExcelFile(int userId, string fileName, byte[] fileContent, string? notes = null);
        BrokerDirectoryInfo? GetLatestDirectory();
        List<BrokerInfo> SearchBrokers(string? searchTerm = null, int? limit = null);
    }

    public class BrokerDirectoryUploadResult
    {
        public int DirectoryId { get; set; }
        public string ExcelFileName { get; set; } = null!;
        public string BlobPath { get; set; } = null!;
        public DateTime UploadedAt { get; set; }
    }

    public class BrokerDirectoryInfo
    {
        public int DirectoryId { get; set; }
        public string ExcelFileName { get; set; } = null!;
        public string BlobPath { get; set; } = null!;
        public long FileSize { get; set; }
        public DateTime UploadedAt { get; set; }
        public int UploadedByUserId { get; set; }
        public string? Notes { get; set; }
    }

    public class BrokerInfo
    {
        public Guid BrokerId { get; set; }
        public string FullName { get; set; } = null!;
        public string? FirmName { get; set; }
        public string? FirmCui { get; set; }
        public string? PublicEmail { get; set; }
        public string? PublicPhone { get; set; }
        public string Status { get; set; } = "pending";
    }
}
