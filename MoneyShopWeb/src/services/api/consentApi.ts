import { apiClient } from './apiClient';

export interface ConsentGrantModel {
  consentType: string;
  docType?: string;
  docVersion?: string;
  consentTextSnapshot: string;
  sessionId?: string;
  sourceChannel?: string;
}

export interface ConsentResponse {
  consentId: string;
  status: string;
  grantedAt: string;
}

export interface ConsentInfo {
  consentId: string;
  consentType: string;
  status: string;
  grantedAt: string;
  revokedAt?: string;
  docType?: string;
  docVersion?: string;
}

export const consentApi = {
  async grantConsent(model: ConsentGrantModel): Promise<ConsentResponse> {
    const response = await apiClient.post<ConsentResponse>('/consent/grant', {
      ...model,
      sourceChannel: model.sourceChannel || 'web',
    });
    return response.data;
  },

  async listConsents(): Promise<{ consents: ConsentInfo[] }> {
    const response = await apiClient.get<{ consents: ConsentInfo[] }>('/consent/list');
    return response.data;
  },

  async revokeConsent(consentId: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/consent/revoke/${consentId}`);
    return response.data;
  },
};
