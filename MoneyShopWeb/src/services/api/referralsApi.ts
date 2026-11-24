import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { apiClient } from '@/services/api/apiClient';
import type { BrokerType } from '@/services/api/brokersApi';

export type ReferralMode = 'Colaborare' | 'Transfer';
export type ReferralStatus = 'AsteaptaClient' | 'Acceptat' | 'Refuzat' | 'Expirat' | 'Anulat';

export const REFERRAL_NOTE_MAX = 500;

export interface BrokerDirectoryItem {
  id: number;
  displayName: string;
  oras?: string | null;
  judet?: string | null;
  type: BrokerType;
}

export interface ReferralFile {
  bankName: string;
  creditType?: 'NP' | 'IP' | null;
  amount: number;
  status: string;
  statusChangedAt: string;
}

export interface ReferralItem {
  id: number;
  fromBrokerProfileId: number;
  fromBrokerName: string;
  toBrokerProfileId: number;
  toBrokerName: string;
  toBrokerOras?: string | null;
  clientUserId?: number | null;
  clientName?: string | null;
  mode: ReferralMode;
  sharePercent: number;
  note?: string | null;
  status: ReferralStatus;
  createdAt: string;
  consentExpiresAt: string;
  consentAt?: string | null;
  canCancel: boolean;
  files?: ReferralFile[] | null;
  shareAmount?: number | null;
}

export interface ReferralOverview {
  sent: ReferralItem[];
  received: ReferralItem[];
  all?: ReferralItem[] | null;
}

export interface ReferralSent {
  referral: ReferralItem;
  smsSent: boolean;
  emailSent: boolean;
}

export interface ReferralConsentView {
  fromName: string;
  toName: string;
  toOras?: string | null;
  mode: ReferralMode;
  sharePercent: number;
  expiresAt: string;
}

export interface ReferralAnswer {
  accepted: boolean;
  fromName: string;
  toName: string;
}

const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'statusCode' in payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const referralsApi = {
  searchBrokers: (params: { q?: string; oras?: string; judet?: string }) =>
    apiClient.get('/crm/broker-directory', { params }).then(r => r.data as BrokerDirectoryItem[]),
  send: (clientUserId: number, input: { toBrokerProfileId: number; mode: ReferralMode; note?: string }) =>
    apiClient.post(`/crm/clients/${clientUserId}/referrals`, input).then(r => r.data as ReferralSent),
  overview: () => apiClient.get('/crm/referrals').then(r => r.data as ReferralOverview),
  cancel: (id: number) => apiClient.post(`/crm/referrals/${id}/cancel`).then(r => r.data as { cancelled: boolean }),

  consentPreview: (token: string) =>
    publicClient.post('/referral-consent/preview', { token }).then(r => unwrap<ReferralConsentView>(r.data)),
  consentRespond: (token: string, accept: boolean) =>
    publicClient.post('/referral-consent/respond', { token, accept }).then(r => unwrap<ReferralAnswer>(r.data)),
};
