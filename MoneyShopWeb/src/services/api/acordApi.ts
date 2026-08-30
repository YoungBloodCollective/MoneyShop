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

export interface AcordSubmitPayload {
  nume: string;
  prenume: string;
  telefon: string;
  email?: string;
  tipAct: string;
  agentCode?: string;
  documentFront: File;
  documentBack: File | null;
  addressProof: File | null;
  signatureDataUri: string;
  acceptIntermediere: boolean;
  acceptMarketing: boolean;
  waiveOug52: boolean;
}

export interface AcordSubmitResult {
  success: boolean;
  acordId?: string;
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

export interface AcordOcrSnapshot {
  lastName?: string;
  firstName?: string;
  cnpMasked?: string;
  idSeries?: string;
  idNumber?: string;
  birthDate?: string;
  sex?: string;
  placeOfBirth?: string;
  address?: string;
  nationality?: string;
  issuedBy?: string;
  issueDate?: string;
  expiryDate?: string;
  confidenceScore?: number;
  isNewFormat: boolean;
  cnpChecksumValid?: boolean;
  cnpBirthDateMatch?: boolean;
  cnpSexMatch?: boolean;
  documentNotExpired?: boolean;
  validationErrors: string[];
}

export interface AcordDetails {
  acordId: string;
  userId: number;
  nume: string;
  prenume: string;
  telefon: string;
  email?: string;
  agentCode?: string;
  tipAct?: string;
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
  ocr?: AcordOcrSnapshot | null;
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

  submit: (payload: AcordSubmitPayload) => {
    const fd = new FormData();
    fd.append('Nume', payload.nume);
    fd.append('Prenume', payload.prenume);
    fd.append('Telefon', payload.telefon);
    if (payload.email) fd.append('Email', payload.email);
    fd.append('TipAct', payload.tipAct);
    if (payload.agentCode) fd.append('AgentCode', payload.agentCode);
    fd.append('DocumentFront', payload.documentFront, payload.documentFront.name);
    if (payload.documentBack) fd.append('DocumentBack', payload.documentBack, payload.documentBack.name);
    if (payload.addressProof) fd.append('AddressProof', payload.addressProof, payload.addressProof.name);
    fd.append('SignatureDataUri', payload.signatureDataUri);
    fd.append('AcceptIntermediere', String(payload.acceptIntermediere));
    fd.append('AcceptMarketing', String(payload.acceptMarketing));
    fd.append('WaiveOug52', String(payload.waiveOug52));

    return publicClient.post('/acord/submit', fd, { timeout: 180000 }).then(r => unwrap<AcordSubmitResult>(r.data));
  },

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
