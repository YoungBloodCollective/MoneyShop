using MoneyShop.ServiceInterface.Interfaces.Kyc;

namespace MoneyShop.ServiceInterface.Interfaces.Acord;

/// <summary>
/// Public "Acord Clienti" flow: a client opens a shared link, identifies themselves,
/// uploads their ID (and proof of address when required), optionally passes a liveness
/// check, then signs the GDPR / credit intermediation consent.
/// </summary>
public interface IAcordService
{
    /// <summary>
    /// Handles the whole form in one call: identify the client, store the three
    /// documents, read the ID, record the consents and the signature.
    /// </summary>
    Task<AcordSubmitResult> SubmitAsync(AcordSubmitInput input, AcordSignContext context);

    /// <summary>
    /// Post-submit work that the client never waits for: document OCR, the signed
    /// agreement PDF, and the email copy. Runs in the background after SubmitAsync.
    /// </summary>
    Task ProcessSubmissionAsync(Guid acordId);

    AcordConsentText GetConsentText();

    /// <summary>Clears stored ID data once its retention period has elapsed.</summary>
    int PurgeExpiredOcrData();

    // ── Admin ──
    List<AcordListItem> ListForAdmin(string? status, string? search);
    AcordDetails? GetDetailsForAdmin(Guid acordId);
    AcordFileContent? GetFileForAdmin(Guid fileId);
    bool UpdateStatusForAdmin(Guid acordId, string status, string? reviewNote);
}

// ── Inputs ──

public class AcordUpload
{
    public byte[] Content { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string MimeType { get; set; } = null!;
}

public class AcordSubmitInput
{
    public string Nume { get; set; } = null!;
    public string Prenume { get; set; } = null!;
    public string Telefon { get; set; } = null!;
    public string? Email { get; set; }
    public string? TipAct { get; set; }
    public string? AgentCode { get; set; }
    public string? Ip { get; set; }

    public AcordUpload DocumentFront { get; set; } = null!;
    public AcordUpload? DocumentBack { get; set; }
    public AcordUpload? AddressProof { get; set; }

    public byte[] SignaturePng { get; set; } = null!;
    public AcordSignChoices Choices { get; set; } = new();
}

public class AcordSubmitResult
{
    public bool Success { get; set; }
    public Guid? AcordId { get; set; }
    public bool RateLimited { get; set; }
    public string? Message { get; set; }
}

public class AcordStartInput
{
    public string Nume { get; set; } = null!;
    public string Prenume { get; set; } = null!;
    public string Telefon { get; set; } = null!;
    public string? Email { get; set; }
    public string? AgentCode { get; set; }
    public string? Ip { get; set; }
}

/// <summary>
/// The three opt-ins the consent document presents separately. Only
/// <see cref="AcceptIntermediere"/> is required - marketing and the OUG 52/2016
/// waiver must remain freely refusable.
/// </summary>
public class AcordSignChoices
{
    public bool AcceptIntermediere { get; set; }
    public bool AcceptMarketing { get; set; }
    public bool WaiveOug52 { get; set; }
}

public class AcordSignContext
{
    public string? Ip { get; set; }
    public string? UserAgent { get; set; }
    public string SourceChannel { get; set; } = "web";
}

// ── Results ──

public class AcordStartResult
{
    public Guid AcordId { get; set; }
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public bool IsResumed { get; set; }
    public bool RateLimited { get; set; }
}

public class AcordSessionView
{
    public Guid AcordId { get; set; }
    public string Nume { get; set; } = null!;
    public string Prenume { get; set; } = null!;
    public string Status { get; set; } = null!;
    public bool HasIdFront { get; set; }
    public bool HasIdBack { get; set; }
    public bool HasSelfie { get; set; }
    public bool HasProofOfAddress { get; set; }
    public bool RequiresProofOfAddress { get; set; }
    public bool IsSigned { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class AcordDocumentResult
{
    public bool Accepted { get; set; }
    public bool IsNewFormat { get; set; }
    public bool RequiresProofOfAddress { get; set; }
    public string? Message { get; set; }
    public OcrData? OcrData { get; set; }
    public LogicValidation? Validation { get; set; }
}

public class AcordLivenessResult
{
    public bool Passed { get; set; }
    public decimal Confidence { get; set; }
    public string? Message { get; set; }
}

public class AcordSignResult
{
    public bool Success { get; set; }
    public Guid? ConsentId { get; set; }
    public DateTime? SignedAt { get; set; }
    public string? Message { get; set; }
}

public class AcordConsentText
{
    public string Version { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Body { get; set; } = null!;
    public bool IsPlaceholder { get; set; }
    public List<AcordConsentOption> Options { get; set; } = new();
}

public class AcordConsentOption
{
    public string Key { get; set; } = null!;
    public string Label { get; set; } = null!;
    public string? Hint { get; set; }
    public bool Required { get; set; }
}

// ── Admin views ──

public class AcordListItem
{
    public Guid AcordId { get; set; }
    public string Nume { get; set; } = null!;
    public string Prenume { get; set; } = null!;
    public string Telefon { get; set; } = null!;
    public string? Email { get; set; }
    public string Status { get; set; } = null!;
    public string? AgentCode { get; set; }
    public bool IsSigned { get; set; }
    public bool? MarketingAccepted { get; set; }
    public bool? LivenessPassed { get; set; }
    public bool? FaceMatchPassed { get; set; }
    public int FileCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class AcordDetails
{
    public Guid AcordId { get; set; }
    public int UserId { get; set; }
    public string Nume { get; set; } = null!;
    public string Prenume { get; set; } = null!;
    public string Telefon { get; set; } = null!;
    public string? Email { get; set; }
    public string? AgentCode { get; set; }
    public string? TipAct { get; set; }
    public string Status { get; set; } = null!;
    public bool? IdIsNewFormat { get; set; }
    public bool? LivenessPassed { get; set; }
    public decimal? LivenessConfidence { get; set; }
    public bool? FaceMatchPassed { get; set; }
    public decimal? FaceMatchConfidence { get; set; }
    public string? ReviewNote { get; set; }
    public DateTime? SignedAt { get; set; }
    public bool? MarketingAccepted { get; set; }
    public bool? Oug52Waived { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime ExpiresAt { get; set; }

    public string? CnpMasked { get; set; }
    public string? Address { get; set; }
    public AcordOcrSnapshot? Ocr { get; set; }

    /// <summary>
    /// False when no external KYC session existed, i.e. OCR / liveness never ran
    /// and the empty fields mean "not checked", not "check failed".
    /// </summary>
    public bool AutomaticChecksRan { get; set; }

    public string? ConsentVersion { get; set; }
    public string? ConsentTextSnapshot { get; set; }
    public string? ConsentIp { get; set; }

    public List<AcordFileInfo> Files { get; set; } = new();
}

/// <summary>
/// Everything the reader returned from the document, kept for the operator to
/// review. The CNP is stored masked - the raw value never lands here.
/// </summary>
public class AcordOcrSnapshot
{
    public string? LastName { get; set; }
    public string? FirstName { get; set; }
    public string? CnpMasked { get; set; }
    public string? IdSeries { get; set; }
    public string? IdNumber { get; set; }
    public string? BirthDate { get; set; }
    public string? Sex { get; set; }
    public string? PlaceOfBirth { get; set; }
    public string? Address { get; set; }
    public string? Nationality { get; set; }
    public string? IssuedBy { get; set; }
    public string? IssueDate { get; set; }
    public string? ExpiryDate { get; set; }
    public decimal? ConfidenceScore { get; set; }
    public bool IsNewFormat { get; set; }

    public bool? CnpChecksumValid { get; set; }
    public bool? CnpBirthDateMatch { get; set; }
    public bool? CnpSexMatch { get; set; }
    public bool? DocumentNotExpired { get; set; }
    public List<string> ValidationErrors { get; set; } = new();
}

public class AcordFileInfo
{
    public Guid FileId { get; set; }
    public string FileType { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public string MimeType { get; set; } = null!;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsDeleted { get; set; }
}

public class AcordFileContent
{
    public string FileName { get; set; } = null!;
    public string MimeType { get; set; } = null!;
    public byte[] Content { get; set; } = null!;
}
