namespace MoneyShop.ServiceInterface.Interfaces.Kyc;

/// <summary>
/// Proxy interface for the external SRV.KYC microservice.
/// Handles automated identity verification: OCR, liveness, face comparison.
/// </summary>
public interface IExternalKycService
{
    Task<KycSessionCreated> CreateSessionAsync();
    Task<OcrResult> SubmitDocumentOcrAsync(string sessionId, string token, byte[] frontImage, byte[]? backImage = null);
    Task<LivenessResult> SubmitLivenessAsync(string sessionId, string token, byte[] selfie);
    Task<ActiveLivenessResult> SubmitActiveLivenessAsync(string sessionId, string token, byte[] selfie, string? challengesJson = null);
    Task<FaceCompareResult> SubmitFaceCompareAsync(string sessionId, string token, byte[] documentPhoto, byte[] selfie);
    Task<KycSessionStatus> GetSessionStatusAsync(string sessionId);
    Task<KycVerificationDecision> GetDecisionAsync(string sessionId);
}

// ── Session ──

public class KycSessionCreated
{
    public string SessionId { get; set; } = null!;
    public string Token { get; set; } = null!;
}

public class KycSessionStatus
{
    public string SessionId { get; set; } = null!;
    public string Status { get; set; } = null!;
    public string? OcrStatus { get; set; }
    public string? LivenessStatus { get; set; }
    public string? ActiveLivenessStatus { get; set; }
    public string? CompareStatus { get; set; }
    public OcrResult? OcrResult { get; set; }
    public LivenessResult? LivenessResult { get; set; }
    public ActiveLivenessResult? ActiveLivenessResult { get; set; }
    public FaceCompareResult? CompareResult { get; set; }
    public AttemptsRemainingInfo? AttemptsRemaining { get; set; }
}

public class AttemptsRemainingInfo
{
    public int Ocr { get; set; }
    public int Liveness { get; set; }
    public int Compare { get; set; }
}

// ── OCR ──

public class OcrResult
{
    public string Decision { get; set; } = null!;
    public string? ReasonCode { get; set; }
    public OcrData? OcrData { get; set; }
    public LogicValidation? LogicValidation { get; set; }
    public string? Error { get; set; }
}

public class OcrData
{
    public string? LastName { get; set; }
    public string? FirstName { get; set; }
    public string? Cnp { get; set; }
    public string? IdSeries { get; set; }
    public string? IdNumber { get; set; }
    public string? ExpiryDate { get; set; }
    public string? BirthDate { get; set; }
    public string? Sex { get; set; }
    public string? Address { get; set; }
    public string? Nationality { get; set; }
    public string? PlaceOfBirth { get; set; }
    public string? IssuedBy { get; set; }
    public string? IssueDate { get; set; }
    public decimal? ConfidenceScore { get; set; }
    public string? RawText { get; set; }
    public bool IsNewFormat { get; set; }
}

public class LogicValidation
{
    public bool IsValid { get; set; }
    public bool CnpChecksumValid { get; set; }
    public bool CnpBirthDateMatch { get; set; }
    public bool CnpSexMatch { get; set; }
    public bool DocumentNotExpired { get; set; }
    public List<string> Errors { get; set; } = new();
}

// ── Liveness ──

public class LivenessResult
{
    public bool LivenessDetected { get; set; }
    public decimal Confidence { get; set; }
    public string Decision { get; set; } = null!;
    public string? ReasonCode { get; set; }
    public string? Error { get; set; }
}

// ── Active Liveness ──

public class ActiveLivenessResult
{
    public bool IsLive { get; set; }
    public decimal Confidence { get; set; }
    public string Decision { get; set; } = null!;
    public string? ReasonCode { get; set; }
    public List<ChallengeResult>? Challenges { get; set; }
    public string? Error { get; set; }
}

public class ChallengeResult
{
    public string Type { get; set; } = null!;
    public bool Passed { get; set; }
    public int DurationMs { get; set; }
}

// ── Face Compare ──

public class FaceCompareResult
{
    public bool FacesMatch { get; set; }
    public decimal Confidence { get; set; }
    public string Decision { get; set; } = null!;
    public string? ReasonCode { get; set; }
    public bool DocumentFaceDetected { get; set; }
    public bool SelfieFaceDetected { get; set; }
    public string? Error { get; set; }
}

// ── Verification Decision (Veriff-compatible) ──

public class KycVerificationDecision
{
    public string? Id { get; set; }
    public int Code { get; set; }
    public string Status { get; set; } = null!;
    public string? Reason { get; set; }
    public string? ReasonCode { get; set; }
    public DecisionPerson? Person { get; set; }
    public DecisionDocument? Document { get; set; }
}

public class DecisionPerson
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Gender { get; set; }
    public string? IdNumber { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Nationality { get; set; }
    public string? PlaceOfBirth { get; set; }
    public List<DecisionAddress>? Addresses { get; set; }
}

public class DecisionAddress
{
    public string? FullAddress { get; set; }
}

public class DecisionDocument
{
    public string? Type { get; set; }
    public string? Number { get; set; }
    public string? Country { get; set; }
    public string? ValidFrom { get; set; }
    public string? ValidUntil { get; set; }
    public string? IssuedBy { get; set; }
}
