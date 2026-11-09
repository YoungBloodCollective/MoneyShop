import { apiClient } from './apiClient';

export interface CrediusForwardResult {
  configured: boolean;
  success: boolean;
  statusCode: number;
  message: string;
  rawResponse?: string;
}

export const crediusApi = {
  async getStatus(): Promise<{ configured: boolean }> {
    const { data } = await apiClient.get<{ configured: boolean }>('/credius/status');
    return data;
  },
  async forward(applicationId: number): Promise<CrediusForwardResult> {
    const { data } = await apiClient.post<CrediusForwardResult>('/credius/forward', { applicationId, consent: true });
    return data;
  },
};
