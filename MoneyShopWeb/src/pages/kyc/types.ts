export interface KycSession {
  sessionId: string;
  token: string;
}

export interface OcrData {
  lastName?: string;
  firstName?: string;
  cnp?: string;
  idSeries?: string;
  idNumber?: string;
  expiryDate?: string;
  birthDate?: string;
  sex?: string;
  address?: string;
  nationality?: string;
  placeOfBirth?: string;
  issuedBy?: string;
  issueDate?: string;
  confidenceScore: number;
  rawText?: string;
  isNewFormat: boolean;
}

export interface LogicValidation {
  isValid: boolean;
  cnpChecksumValid: boolean;
  cnpBirthDateMatch: boolean;
  cnpSexMatch: boolean;
  documentNotExpired: boolean;
  errors: string[];
}

export interface BiometricResult {
  livenessDetected: boolean;
  matchScore: number;
  verifyResult: boolean;
  error?: string;
}

export interface KycResult {
  decision: "pass" | "review" | "fail";
  reasonCode: string;
  ocrData?: OcrData;
  logicValidation?: LogicValidation;
  biometrics?: BiometricResult;
}

export interface OcrOnlyResult {
  decision: "pass" | "review" | "fail";
  reasonCode: string;
  ocrData?: OcrData;
  logicValidation?: LogicValidation;
  error?: string;
}

export interface LivenessOnlyResult {
  livenessDetected: boolean;
  confidence: number;
  decision: "pass" | "fail";
  reasonCode: string;
  error?: string;
}

export interface FaceCompareResult {
  facesMatch: boolean;
  confidence: number;
  decision: "pass" | "fail";
  reasonCode: string;
  documentFaceDetected: boolean;
  selfieFaceDetected: boolean;
  error?: string;
}

export interface ActiveLivenessResult {
  isLive: boolean;
  confidence: number;
  decision: "pass" | "fail";
  reasonCode: string;
  challenges: ActiveChallengeResult[];
  error?: string;
}

export interface ActiveChallengeResult {
  type: string;
  passed: boolean;
  durationMs: number;
}

export type CaptureStep = "front" | "back" | "selfie";

// ─── Admin ──────────────────────────────────────────────────────────

export interface AdminSessionSummary {
  sessionId: string;
  sessionType: string;
  status: string;
  decision: string | null;
  reasonCode: string | null;
  createdAt: string;
  completedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  cnp: string | null;
  matchScore: number | null;
  livenessDetected: boolean | null;
  documentFraudScore: number | null;
  selfieFraudScore: number | null;
  fraudWarnings: string[];
}

export interface AdminSessionDetail {
  sessionId: string;
  sessionType: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  ocrResult: OcrOnlyResult | null;
  livenessResult: LivenessOnlyResult | null;
  activeLivenessResult: ActiveLivenessResult | null;
  compareResult: FaceCompareResult | null;
  result: KycResult | null;
  documentFrontImage: string | null;
  documentBackImage: string | null;
  selfieImage: string | null;
}
