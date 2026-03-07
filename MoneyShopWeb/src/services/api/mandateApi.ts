import { apiClient } from './apiClient';

export interface MandateCreateModel {
  mandateType: string;
  consentEventId?: string;
  expiresInDays?: number;
}

export interface MandateResponse {
  mandateId: string;
  status: string;
  grantedAt: string;
  expiresAt: string;
}

export interface MandateInfo {
  mandateId: string;
  mandateType: string;
  status: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export const mandateApi = {
  async createMandate(model: MandateCreateModel): Promise<MandateResponse> {
    const response = await apiClient.post<MandateResponse>('/mandate/create', {
      ...model,
      expiresInDays: model.expiresInDays || 30,
    });
    return response.data;
  },

  async getMandate(mandateId: string): Promise<MandateInfo> {
    const response = await apiClient.get<MandateInfo>(`/mandate/${mandateId}`);
    return response.data;
  },

  async listMandates(): Promise<{ mandates: MandateInfo[] }> {
    const response = await apiClient.get<{ mandates: MandateInfo[] }>('/mandate/list');
    return response.data;
  },

  async checkMandate(mandateType: string): Promise<{ hasActiveMandate: boolean }> {
    const response = await apiClient.get<{ hasActiveMandate: boolean }>(`/mandate/check/${mandateType}`);
    return response.data;
  },

  async revokeMandate(mandateId: string, reason?: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/mandate/revoke/${mandateId}`, { reason });
    return response.data;
  },
};
