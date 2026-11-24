import { apiClient } from '@/services/api/apiClient';

export type CoDebtorRelation = 'Sot' | 'Parinte' | 'Copil' | 'Frate' | 'Ruda' | 'Partener' | 'Altul';

export const CO_DEBTOR_RELATIONS: { key: CoDebtorRelation; label: string }[] = [
  { key: 'Sot', label: 'Soț/Soție' },
  { key: 'Parinte', label: 'Părinte' },
  { key: 'Copil', label: 'Copil' },
  { key: 'Frate', label: 'Frate/Soră' },
  { key: 'Ruda', label: 'Altă rudă' },
  { key: 'Partener', label: 'Partener/ă (fără căsătorie)' },
  { key: 'Altul', label: 'Fără rudenie' },
];

export interface CoDebtorItem {
  id: number;
  userId: number;
  fullName: string;
  phone?: string | null;
  relation: CoDebtorRelation;
  relationLabel: string;
  acordStatus?: string | null;
  acordSignedAt?: string | null;
  createdAt: string;
}

export interface CoDebtorsView {
  coDebtors: CoDebtorItem[];
  coDebtorFor: CoDebtorItem[];
}

export interface CoDebtorCandidate {
  userId: number;
  fullName: string;
  phone?: string | null;
  acordSignedAt?: string | null;
}

export const codebitoriApi = {
  list: (clientUserId: number) =>
    apiClient.get(`/crm/clients/${clientUserId}/codebitori`).then(r => r.data as CoDebtorsView),
  candidates: (clientUserId: number, q: string) =>
    apiClient.get(`/crm/clients/${clientUserId}/codebitori/candidates`, { params: { q: q || undefined } }).then(r => r.data as CoDebtorCandidate[]),
  add: (clientUserId: number, input: { coDebtorUserId: number; relation: CoDebtorRelation }) =>
    apiClient.post(`/crm/clients/${clientUserId}/codebitori`, input).then(r => r.data as CoDebtorItem),
  remove: (clientUserId: number, id: number) =>
    apiClient.delete(`/crm/clients/${clientUserId}/codebitori/${id}`).then(r => r.data as { removed: boolean }),
};
