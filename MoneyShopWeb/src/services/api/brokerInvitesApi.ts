import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { apiClient } from '@/services/api/apiClient';
import type { BrokerType } from '@/services/api/brokersApi';

export type BrokerInviteStatus = 'pending' | 'used' | 'expired' | 'revoked';

export interface BrokerInviteItem {
  id: number;
  email: string;
  name?: string | null;
  type: BrokerType;
  status: BrokerInviteStatus;
  createdAt: string;
  expiresAt: string;
  usedAt?: string | null;
  revokedAt?: string | null;
}

export interface BrokerInviteSent {
  invite: BrokerInviteItem;
  emailSent: boolean;
}

export interface BrokerInvitePreview {
  email: string;
  name?: string | null;
  type: BrokerType;
}

export interface BrokerTermsText {
  version: string;
  title: string;
  body: string;
}

export interface BrokerInviteAccept {
  nume: string;
  prenume: string;
  telefon: string;
  password: string;
  passwordConfirm: string;
  oras: string;
  judet: string;
  slug: string;
  firmaNume: string;
  firmaCui: string;
  acceptTerms: boolean;
  termsVersion: string;
}

export interface SlugAvailability {
  slug: string;
  available: boolean;
  reason?: string | null;
}

const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'statusCode' in payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

const base = '/broker-invites';

export const brokerInvitesApi = {
  list: () => apiClient.get(base).then(r => r.data as BrokerInviteItem[]),
  create: (input: { email: string; name?: string; type: BrokerType }) =>
    apiClient.post(base, input).then(r => r.data as BrokerInviteSent),
  resend: (id: number) => apiClient.post(`${base}/${id}/resend`).then(r => r.data as BrokerInviteSent),
  revoke: (id: number) => apiClient.post(`${base}/${id}/revoke`).then(r => r.data as BrokerInviteItem),

  terms: () => publicClient.get(`${base}/terms`).then(r => unwrap<BrokerTermsText>(r.data)),
  preview: (token: string) =>
    publicClient.get(`${base}/${encodeURIComponent(token)}`).then(r => unwrap<BrokerInvitePreview>(r.data)),
  slugAvailable: (token: string, slug: string) =>
    publicClient.get(`${base}/${encodeURIComponent(token)}/slug-available`, { params: { slug } }).then(r => unwrap<SlugAvailability>(r.data)),
  accept: (token: string, input: BrokerInviteAccept) =>
    publicClient.post(`${base}/${encodeURIComponent(token)}/accept`, input).then(r => unwrap<{ success: boolean; slug: string }>(r.data)),
};
