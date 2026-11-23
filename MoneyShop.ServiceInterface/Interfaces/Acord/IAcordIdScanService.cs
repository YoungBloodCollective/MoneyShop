namespace MoneyShop.ServiceInterface.Interfaces.Acord;

public interface IAcordIdScanService
{
    /// <summary>
    /// Reads an ID card with the OCR provider and says which documents the acord still needs.
    /// Nothing is stored and the full CNP never leaves the server. Throws
    /// <see cref="ArgumentException"/> (Romanian message) when a file is empty, too big or not an image.
    /// </summary>
    Task<AcordIdScanResult> ScanAsync(byte[] front, byte[]? back);
}

public class AcordIdScanResult
{
    public bool Readable { get; set; }
    public bool IsNewFormat { get; set; }
    public bool HasAddress { get; set; }
    public string? LastName { get; set; }
    public string? FirstName { get; set; }
    public string? CnpMasked { get; set; }
    public string? ExpiryDate { get; set; }
    public bool Expired { get; set; }
    public bool NeedsBack { get; set; }
    public bool NeedsProofOfAddress { get; set; }
    public string? TipAct { get; set; }
    public List<string> Problems { get; set; } = new();
}
