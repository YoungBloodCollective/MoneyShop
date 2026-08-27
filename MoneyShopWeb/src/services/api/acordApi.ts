import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { apiClient } from '@/services/api/apiClient';

export interface AcordConsentOption {
  key: string;
  label: string;
  hint?: string;
  required: boolean;
}

export interface AcordConsentText {
  version: string;
  title: string;
  body: string;
  isPlaceholder: boolean;
  options: AcordConsentOption[];
}

export interface AcordSignChoices {
  acceptIntermediere: boolean;
  acceptMarketing: boolean;
  waiveOug52: boolean;
}

export interface AcordStartResult {
  acordId: string;
  token: string;
  expiresAt: string;
  isResumed: boolean;
}

export interface AcordSession {
  acordId: string;
  nume: string;
  prenume: string;
  status: string;
  hasIdFront: boolean;
  hasIdBack: boolean;
  hasSelfie: boolean;
  hasProofOfAddress: boolean;
  requiresProofOfAddress: boolean;
  isSigned: boolean;
  expiresAt: string;
}

export interface AcordOcrData {
  lastName?: string;
  firstName?: string;
  expiryDate?: string;
  address?: string;
  isNewFormat: boolean;
}

export interface AcordDocumentResult {
  accepted: boolean;
  isNewFormat: boolean;
  requiresProofOfAddress: boolean;
  message?: string;
  ocrData?: AcordOcrData;
}

export interface AcordLivenessResult {
  passed: boolean;
  confidence: number;
  message?: string;
}

export interface AcordSignResult {
  success: boolean;
  consentId?: string;
  signedAt?: string;
  message?: string;
}

export interface AcordListItem {
  acordId: string;
  nume: string;
  prenume: string;
  telefon: string;
  email?: string;
  status: string;
  agentCode?: string;
  isSigned: boolean;
  marketingAccepted?: boolean;
  livenessPassed?: boolean;
  faceMatchPassed?: boolean;
  fileCount: number;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
}

export interface AcordFileInfo {
  fileId: string;
  fileType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  expiresAt: string;
  isDeleted: boolean;
}

export interface AcordDetails {
  acordId: string;
  userId: number;
  nume: string;
  prenume: string;
  telefon: string;
  email?: string;
  agentCode?: string;
  status: string;
  idIsNewFormat?: boolean;
  livenessPassed?: boolean;
  livenessConfidence?: number;
  faceMatchPassed?: boolean;
  faceMatchConfidence?: number;
  reviewNote?: string;
  signedAt?: string;
  marketingAccepted?: boolean;
  oug52Waived?: boolean;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  cnpMasked?: string;
  address?: string;
  automaticChecksRan: boolean;
  consentVersion?: string;
  consentTextSnapshot?: string;
  consentIp?: string;
  files: AcordFileInfo[];
}

// The public flow runs without a JWT, so it must not go through the shared
// apiClient - its 401 interceptor would redirect the client to the login page.
const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'statusCode' in payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const acordApi = {
  getConsentText: () =>
    publicClient.get('/acord/consent-text').then(r => unwrap<AcordConsentText>(r.data)),

  start: (payload: { nume: string; prenume: string; telefon: string; email?: string; agentCode?: string }) =>
    publicClient.post('/acord/start', payload).then(r => unwrap<AcordStartResult>(r.data)),

  getSession: (token: string) =>
    publicClient.get(`/acord/session/${token}`).then(r => unwrap<AcordSession>(r.data)),

  submitDocument: (token: string, front: Blob, back?: Blob) => {
    const fd = new FormData();
    fd.append('DocumentFront', front, 'front.jpg');
    if (back) fd.append('DocumentBack', back, 'back.jpg');
    return publicClient.post(`/acord/document/${token}`, fd).then(r => unwrap<AcordDocumentResult>(r.data));
  },

  submitLiveness: (token: string, selfie: Blob) => {
    const fd = new FormData();
    fd.append('Selfie', selfie, 'selfie.jpg');
    return publicClient.post(`/acord/liveness/${token}`, fd).then(r => unwrap<AcordLivenessResult>(r.data));
  },

  submitAddressProof: (token: string, file: File) => {
    const fd = new FormData();
    fd.append('File', file, file.name);
    return publicClient.post(`/acord/address-proof/${token}`, fd).then(r => unwrap<{ success: boolean }>(r.data));
  },

  sign: (token: string, signatureDataUri: string, choices: AcordSignChoices) =>
    publicClient
      .post(`/acord/sign/${token}`, { signatureDataUri, ...choices })
      .then(r => unwrap<AcordSignResult>(r.data)),

  // ── Admin (JWT) ──

  adminList: (params?: { status?: string; search?: string }) =>
    apiClient.get('/acord/admin/list', { params }).then(r => r.data as AcordListItem[]),

  adminDetails: (acordId: string) =>
    apiClient.get(`/acord/admin/${acordId}`).then(r => r.data as AcordDetails),

  adminFileUrl: (fileId: string) => `${API_BASE_URL}/acord/admin/file/${fileId}`,

  adminFileBlob: (fileId: string) =>
    apiClient.get(`/acord/admin/file/${fileId}`, { responseType: 'blob' }).then(r => r.data as Blob),

  adminUpdateStatus: (acordId: string, status: string, reviewNote?: string) =>
    apiClient.post(`/acord/admin/${acordId}/status`, { status, reviewNote }).then(r => r.data),
};
