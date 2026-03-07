import {apiClient} from './apiClient';
import {Platform} from 'react-native';

// ── Types ──

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
  challenges?: Array<{type: string; passed: boolean; durationMs: number}>;
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
      addresses?: Array<{fullAddress?: string}>;
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

// ── Legacy admin types (kept for KycAdminScreen) ──

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

// ── Helper: prepare image for multipart upload ──

async function prepareImageFormData(
  fieldName: string,
  imageUri: string,
  fileName: string = 'image.jpg',
): Promise<{formData: FormData; append: (fd: FormData) => void}> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    if (imageUri.startsWith('data:')) {
      const match = imageUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error('Invalid data URI format');
      const mimeType = match[1] || 'image/jpeg';
      const base64Data = match[2];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const file = new File([bytes], fileName, {type: mimeType});
      formData.append(fieldName, file);
    } else {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const file = new File([blob], fileName, {type: 'image/jpeg'});
      formData.append(fieldName, file);
    }
  } else {
    formData.append(fieldName, {
      uri: imageUri,
      type: 'image/jpeg',
      name: fileName,
    } as any);
  }

  return {formData, append: () => {}};
}

// ── API ──

export const kycApi = {
  // ── New automated KYC flow ──

  /** Start a new KYC verification session */
  startSession: async (): Promise<KycStartResponse> => {
    const response = await apiClient.post('/kyc-verify/start');
    return response.data;
  },

  /** Submit ID document front (+ optional back) for OCR */
  submitDocument: async (
    frontImageUri: string,
    backImageUri?: string,
  ): Promise<OcrResult> => {
    const formData = new FormData();

    // Front image
    if (Platform.OS === 'web') {
      if (frontImageUri.startsWith('data:')) {
        const match = frontImageUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error('Invalid data URI');
        const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        formData.append('DocumentFront', new File([bytes], 'front.jpg', {type: match[1]}));
      } else {
        const res = await fetch(frontImageUri);
        const blob = await res.blob();
        formData.append('DocumentFront', new File([blob], 'front.jpg', {type: 'image/jpeg'}));
      }
    } else {
      formData.append('DocumentFront', {uri: frontImageUri, type: 'image/jpeg', name: 'front.jpg'} as any);
    }

    // Back image (optional)
    if (backImageUri) {
      if (Platform.OS === 'web') {
        if (backImageUri.startsWith('data:')) {
          const match = backImageUri.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
            formData.append('DocumentBack', new File([bytes], 'back.jpg', {type: match[1]}));
          }
        } else {
          const res = await fetch(backImageUri);
          const blob = await res.blob();
          formData.append('DocumentBack', new File([blob], 'back.jpg', {type: 'image/jpeg'}));
        }
      } else {
        formData.append('DocumentBack', {uri: backImageUri, type: 'image/jpeg', name: 'back.jpg'} as any);
      }
    }

    const response = await apiClient.post('/kyc-verify/document', formData);
    return response.data;
  },

  /** Submit selfie for basic liveness detection */
  submitLiveness: async (selfieUri: string): Promise<LivenessResult> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      if (selfieUri.startsWith('data:')) {
        const match = selfieUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error('Invalid data URI');
        const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        formData.append('Selfie', new File([bytes], 'selfie.jpg', {type: match[1]}));
      } else {
        const res = await fetch(selfieUri);
        const blob = await res.blob();
        formData.append('Selfie', new File([blob], 'selfie.jpg', {type: 'image/jpeg'}));
      }
    } else {
      formData.append('Selfie', {uri: selfieUri, type: 'image/jpeg', name: 'selfie.jpg'} as any);
    }

    const response = await apiClient.post('/kyc-verify/liveness', formData);
    return response.data;
  },

  /** Submit selfie + challenge results for active liveness */
  submitActiveLiveness: async (
    selfieUri: string,
    challenges: Array<{type: string; passed: boolean; durationMs: number}>,
  ): Promise<ActiveLivenessResult> => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      if (selfieUri.startsWith('data:')) {
        const match = selfieUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error('Invalid data URI');
        const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        formData.append('Selfie', new File([bytes], 'liveness.jpg', {type: match[1]}));
      } else {
        const res = await fetch(selfieUri);
        const blob = await res.blob();
        formData.append('Selfie', new File([blob], 'liveness.jpg', {type: 'image/jpeg'}));
      }
    } else {
      formData.append('Selfie', {uri: selfieUri, type: 'image/jpeg', name: 'liveness.jpg'} as any);
    }

    formData.append('ChallengesJson', JSON.stringify(challenges));

    const response = await apiClient.post('/kyc-verify/active-liveness', formData);
    return response.data;
  },

  /** Trigger face comparison — sends document photo + selfie */
  submitFaceCompare: async (
    documentPhotoUri: string,
    selfieUri: string,
  ): Promise<DecisionResponse> => {
    const formData = new FormData();

    // Document photo
    if (Platform.OS === 'web') {
      if (documentPhotoUri.startsWith('data:')) {
        const match = documentPhotoUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error('Invalid data URI');
        const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        formData.append('DocumentPhoto', new File([bytes], 'document.jpg', {type: match[1]}));
      } else {
        const res = await fetch(documentPhotoUri);
        const blob = await res.blob();
        formData.append('DocumentPhoto', new File([blob], 'document.jpg', {type: 'image/jpeg'}));
      }
    } else {
      formData.append('DocumentPhoto', {uri: documentPhotoUri, type: 'image/jpeg', name: 'document.jpg'} as any);
    }

    // Selfie
    if (Platform.OS === 'web') {
      if (selfieUri.startsWith('data:')) {
        const match = selfieUri.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error('Invalid data URI');
        const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        formData.append('Selfie', new File([bytes], 'selfie.jpg', {type: match[1]}));
      } else {
        const res = await fetch(selfieUri);
        const blob = await res.blob();
        formData.append('Selfie', new File([blob], 'selfie.jpg', {type: 'image/jpeg'}));
      }
    } else {
      formData.append('Selfie', {uri: selfieUri, type: 'image/jpeg', name: 'selfie.jpg'} as any);
    }

    const response = await apiClient.post('/kyc-verify/face-compare', formData);
    return response.data;
  },

  /** Get current KYC status for the authenticated user */
  getStatus: async (): Promise<KycStatusResponse> => {
    const response = await apiClient.get('/kyc-verify/status');
    return response.data;
  },

  // ── Legacy admin endpoints (kept for KycAdminScreen) ──

  getAllPending: async (): Promise<KycPending[]> => {
    const response = await apiClient.get('/kyc/pending');
    return Array.isArray(response.data) ? response.data : [];
  },

  getDetails: async (kycId: string): Promise<KycDetails> => {
    const response = await apiClient.get(`/kyc/details/${kycId}`);
    return response.data;
  },

  getFile: async (fileId: string): Promise<{fileContentBase64: string; dataUri: string; mimeType: string; fileName: string}> => {
    const response = await apiClient.get(`/kyc/file/${fileId}`);
    return response.data;
  },

  updateStatus: async (
    kycId: string,
    status: 'verified' | 'rejected',
    rejectionReason?: string,
  ): Promise<void> => {
    await apiClient.post('/kyc/update-status', {kycId, status, rejectionReason});
  },
};
