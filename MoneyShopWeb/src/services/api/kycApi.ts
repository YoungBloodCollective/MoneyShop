import { apiClient } from './apiClient';

export interface KycStartResponse {
  kycId: string;
  sessionId: string;
  token: string;
  status: string;
}

export interface KycStatusResponse {
  kycId: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  createdAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  externalSessionId?: string;
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
  confidenceScore?: number;
  isNewFormat: boolean;
}

export interface OcrResult {
  decision: string;
  reasonCode?: string;
  ocrData?: OcrData;
  logicValidation?: {
    isValid: boolean;
    cnpChecksumValid: boolean;
    cnpBirthDateMatch: boolean;
    cnpSexMatch: boolean;
    documentNotExpired: boolean;
    errors: string[];
  };
  error?: string;
}

export interface LivenessResult {
  livenessDetected: boolean;
  confidence: number;
  decision: string;
  reasonCode?: string;
  error?: string;
}

export interface ActiveLivenessResult {
  isLive: boolean;
  confidence: number;
  decision: string;
  reasonCode?: string;
  challenges?: Array<{ type: string; passed: boolean; durationMs: number }>;
  error?: string;
}

export interface FaceCompareResult {
  facesMatch: boolean;
  confidence: number;
  decision: string;
  reasonCode?: string;
  documentFaceDetected: boolean;
  selfieFaceDetected: boolean;
  error?: string;
}

export interface DecisionResponse {
  faceCompare: FaceCompareResult;
  decision: {
    code: number;
    status: string;
    reason?: string;
    person?: {
      firstName?: string;
      lastName?: string;
      gender?: string;
      idNumber?: string;
      dateOfBirth?: string;
      nationality?: string;
      placeOfBirth?: string;
      addresses?: Array<{ fullAddress?: string }>;
    };
    document?: {
      type?: string;
      number?: string;
      country?: string;
      validFrom?: string;
      validUntil?: string;
      issuedBy?: string;
    };
  };
}

export interface KycPending {
  kycId: string;
  userId: number;
  userName: string;
  userEmail: string;
  kycType: string;
  createdAt: string;
  expiresAt: string;
  fileCount: number;
}

export interface KycDetails {
  kycId: string;
  userId: number;
  userName: string;
  userEmail: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  rejectionReason?: string;
  files: KycFileDetail[];
}

export interface KycFileDetail {
  fileId: string;
  fileType: string;
  fileName: string;
  fileContentBase64?: string;
  mimeType: string;
  dataUri?: string;
  createdAt: string;
}

// Web-only helper: convert image source to FormData file
async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  imageSource: string | File,
  fileName: string = 'image.jpg',
): Promise<void> {
  if (imageSource instanceof File) {
    formData.append(fieldName, imageSource);
    return;
  }

  // Data URI
  if (imageSource.startsWith('data:')) {
    const match = imageSource.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URI format');
    const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
    formData.append(fieldName, new File([bytes], fileName, { type: match[1] }));
    return;
  }

  // Blob URL or regular URL
  const res = await fetch(imageSource);
  const blob = await res.blob();
  formData.append(fieldName, new File([blob], fileName, { type: 'image/jpeg' }));
}

export const kycApi = {
  startSession: async (): Promise<KycStartResponse> => {
    const response = await apiClient.post('/kyc-verify/start');
    return response.data;
  },

  submitDocument: async (
    frontImage: string | File,
    backImage?: string | File,
  ): Promise<OcrResult> => {
    const formData = new FormData();
    await appendImageToFormData(formData, 'DocumentFront', frontImage, 'front.jpg');
    if (backImage) {
      await appendImageToFormData(formData, 'DocumentBack', backImage, 'back.jpg');
    }
    const response = await apiClient.post('/kyc-verify/document', formData);
    return response.data;
  },

  submitLiveness: async (selfie: string | File): Promise<LivenessResult> => {
    const formData = new FormData();
    await appendImageToFormData(formData, 'Selfie', selfie, 'selfie.jpg');
    const response = await apiClient.post('/kyc-verify/liveness', formData);
    return response.data;
  },

  submitActiveLiveness: async (
    selfie: string | File,
    challenges: Array<{ type: string; passed: boolean; durationMs: number }>,
  ): Promise<ActiveLivenessResult> => {
    const formData = new FormData();
    await appendImageToFormData(formData, 'Selfie', selfie, 'liveness.jpg');
    formData.append('ChallengesJson', JSON.stringify(challenges));
    const response = await apiClient.post('/kyc-verify/active-liveness', formData);
    return response.data;
  },

  submitFaceCompare: async (
    documentPhoto: string | File,
    selfie: string | File,
  ): Promise<DecisionResponse> => {
    const formData = new FormData();
    await appendImageToFormData(formData, 'DocumentPhoto', documentPhoto, 'document.jpg');
    await appendImageToFormData(formData, 'Selfie', selfie, 'selfie.jpg');
    const response = await apiClient.post('/kyc-verify/face-compare', formData);
    return response.data;
  },

  getStatus: async (): Promise<KycStatusResponse> => {
    const response = await apiClient.get('/kyc-verify/status');
    return response.data;
  },

  // Admin endpoints
  getStats: async (): Promise<{ total: number; verified: number; pending: number; rejected: number }> => {
    const response = await apiClient.get('/kyc/stats');
    return response.data;
  },

  getAllPending: async (): Promise<KycPending[]> => {
    const response = await apiClient.get('/kyc/pending');
    return Array.isArray(response.data) ? response.data : [];
  },

  getDetails: async (kycId: string): Promise<KycDetails> => {
    const response = await apiClient.get(`/kyc/details/${kycId}`);
    return response.data;
  },

  getFile: async (fileId: string): Promise<{ fileContentBase64: string; dataUri: string; mimeType: string; fileName: string }> => {
    const response = await apiClient.get(`/kyc/file/${fileId}`);
    return response.data;
  },

  updateStatus: async (
    kycId: string,
    status: 'verified' | 'rejected',
    rejectionReason?: string,
  ): Promise<void> => {
    await apiClient.post('/kyc/update-status', { kycId, status, rejectionReason });
  },

  // QR-based scan endpoints
  startScanSession: async (): Promise<{ kycId: string; accessToken: string; externalSessionId: string; externalToken: string; expiresAt: string; status: string }> => {
    const response = await apiClient.post('/kyc-scan/start');
    return response.data;
  },

  getScanStatus: async (token: string): Promise<{ kycId: string; status: string; verifiedAt?: string; rejectionReason?: string }> => {
    const response = await apiClient.get(`/kyc-scan/status/${token}`);
    return response.data;
  },
};
