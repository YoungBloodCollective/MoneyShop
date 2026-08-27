import axios from "axios";
import type {
  KycSession,
  OcrOnlyResult,
  LivenessOnlyResult,
  FaceCompareResult,
  ActiveLivenessResult,
} from "../types";

const KYC_API_URL = import.meta.env.VITE_KYC_API_URL || "https://kycybc-2.azurewebsites.net";
const KYC_API_KEY = import.meta.env.VITE_KYC_API_KEY || "sk-kyc-843f3b01411dfd5aebd393a45b793f7ae9b75c30d0b77333";

const kycApi = axios.create({
  baseURL: KYC_API_URL,
  headers: { "X-API-Key": KYC_API_KEY },
});

export async function createSession(): Promise<KycSession> {
  const { data } = await kycApi.post<KycSession>("/api/kyc/sessions");
  return data;
}

export async function submitOcr(
  sessionId: string,
  token: string,
  documentFront: Blob,
  documentBack?: Blob | null
): Promise<OcrOnlyResult> {
  const form = new FormData();
  form.append("documentFront", documentFront, "front.jpg");
  if (documentBack) form.append("documentBack", documentBack, "back.jpg");
  const { data } = await kycApi.post<OcrOnlyResult>(
    `/api/kyc/ocr/sessions/${sessionId}/verify?token=${token}`,
    form
  );
  return data;
}

export async function submitLiveness(
  sessionId: string,
  token: string,
  selfie: Blob
): Promise<LivenessOnlyResult> {
  const form = new FormData();
  form.append("selfie", selfie, "selfie.jpg");
  const { data } = await kycApi.post<LivenessOnlyResult>(
    `/api/kyc/liveness/sessions/${sessionId}/verify?token=${token}`,
    form
  );
  return data;
}

export async function submitFaceCompare(
  sessionId: string,
  token: string,
  documentPhoto?: Blob | null,
  selfie?: Blob | null
): Promise<FaceCompareResult> {
  const form = new FormData();
  if (documentPhoto) form.append("documentPhoto", documentPhoto, "doc.jpg");
  if (selfie) form.append("selfie", selfie, "selfie.jpg");
  const { data } = await kycApi.post<FaceCompareResult>(
    `/api/kyc/compare/sessions/${sessionId}/verify?token=${token}`,
    form
  );
  return data;
}

export async function submitActiveLiveness(
  sessionId: string,
  token: string,
  selfie: Blob,
  challenges: { type: string; passed: boolean; durationMs: number }[]
): Promise<ActiveLivenessResult> {
  const form = new FormData();
  form.append("selfie", selfie, "selfie.jpg");
  form.append("challengesJson", JSON.stringify(challenges));
  const { data } = await kycApi.post<ActiveLivenessResult>(
    `/api/kyc/active-liveness/sessions/${sessionId}/verify?token=${token}`,
    form
  );
  return data;
}
