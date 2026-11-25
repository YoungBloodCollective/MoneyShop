import { apiClient } from './apiClient';

export type AssignableType = 'appointment' | 'lead' | 'acord';

export interface InboxItem {
  entityType: AssignableType;
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  detail?: string | null;
  status?: string | null;
  source?: string | null;
  createdAt: string;
  answers?: string | null;
}

export interface AssignResult {
  entityType: AssignableType;
  id: string;
  fromBrokerProfileId: number | null;
  toBrokerProfileId: number | null;
  action: 'assign' | 'transfer' | 'unassign' | 'unchanged';
}

/** Super Admin: requests without a broker, and (re)assigning them. Every change is audited. */
export const assignmentsApi = {
  inbox: () => apiClient.get('/assignments/inbox').then(r => r.data as InboxItem[]),
  assign: (input: { entityType: AssignableType; id: string; brokerProfileId: number | null; reason?: string }) =>
    apiClient.post('/assignments', input).then(r => r.data as AssignResult),
};
