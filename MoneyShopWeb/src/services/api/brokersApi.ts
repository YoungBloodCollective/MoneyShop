import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { apiClient } from '@/services/api/apiClient';

export interface BrokerPublicProfile {
  slug: string;
  displayName: string;
  phone?: string | null;
  email?: string | null;
  bio?: string | null;
  acordAvailable: boolean;
  mangoAgreementEnabled: boolean;
  proCreditConsentEnabled: boolean;
}

export interface BrokerProfile {
  id: number;
  userId: number;
  slug: string;
  displayName: string;
  publicPhone?: string | null;
  publicEmail?: string | null;
  notificationEmail?: string | null;
  bio?: string | null;
  status: 'Active' | 'Suspended';
  plan: string;
  loginEmail: string;
  loginPhone?: string | null;
  hasPassword: boolean;
  firmaNume?: string | null;
  firmaSediu?: string | null;
  firmaCui?: string | null;
  firmaRegCom?: string | null;
  firmaEuid?: string | null;
  firmaDataInfiintarii?: string | null;
  reprezentantNume?: string | null;
  reprezentantTelefon?: string | null;
  mangoAgreementEnabled: boolean;
  mangoEmail?: string | null;
  proCreditConsentEnabled: boolean;
  acordAvailable: boolean;
  createdAt: string;
}

export interface BrokerAdminItem {
  id: number;
  slug: string;
  displayName: string;
  loginEmail: string;
  status: 'Active' | 'Suspended';
  plan: string;
  acordAvailable: boolean;
  acorduri: number;
  programari: number;
  cereri: number;
  createdAt: string;
}

export type BrokerSelfUpdate = Partial<Pick<BrokerProfile, 'displayName' | 'publicPhone' | 'publicEmail' | 'notificationEmail' | 'bio'>>;

export type BrokerAdminUpdate = BrokerSelfUpdate & Partial<Pick<BrokerProfile,
  'slug' | 'status' | 'plan' | 'firmaNume' | 'firmaSediu' | 'firmaCui' | 'firmaRegCom' | 'firmaEuid' |
  'firmaDataInfiintarii' | 'reprezentantNume' | 'reprezentantTelefon' | 'mangoAgreementEnabled' | 'mangoEmail' | 'proCreditConsentEnabled'>>;

export interface BrokerCreate extends BrokerAdminUpdate {
  nume: string;
  prenume: string;
  loginEmail: string;
  loginPhone?: string;
  password?: string;
}

const publicClient = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'statusCode' in payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const brokersApi = {
  getPublic: (slug: string) =>
    publicClient.get(`/public/brokers/${encodeURIComponent(slug)}`).then(r => unwrap<BrokerPublicProfile>(r.data)),

  getMe: () => apiClient.get('/brokers/me').then(r => r.data as BrokerProfile),
  updateMe: (input: BrokerSelfUpdate) => apiClient.put('/brokers/me', input).then(r => r.data as BrokerProfile),

  list: () => apiClient.get('/brokers').then(r => r.data as BrokerAdminItem[]),
  get: (id: number) => apiClient.get(`/brokers/${id}`).then(r => r.data as BrokerProfile),
  create: (input: BrokerCreate) => apiClient.post('/brokers', input).then(r => r.data as BrokerProfile),
  update: (id: number, input: BrokerAdminUpdate) => apiClient.put(`/brokers/${id}`, input).then(r => r.data as BrokerProfile),
  setPassword: (id: number, password: string) => apiClient.post(`/brokers/${id}/password`, { password }).then(r => r.data),
};
