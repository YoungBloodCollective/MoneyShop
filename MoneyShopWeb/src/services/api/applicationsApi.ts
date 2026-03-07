import { apiClient } from './apiClient';
import type { Application, CreateApplicationRequest } from '@/types/application.types';

export const applicationsApi = {
  async getAll(): Promise<Application[]> {
    try {
      const response = await apiClient.get<Application[]>('/applications');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
  },

  async getById(id: number): Promise<Application> {
    const response = await apiClient.get<Application>(`/applications/${id}`);
    return response.data;
  },

  async createApplication(data: { loanType: string; requestedAmount: number; requestedTermMonths: number; purpose?: string }): Promise<Application> {
    const request: CreateApplicationRequest = {
      typeCredit: data.loanType,
      tipOperatiune: data.loanType === 'REFINANTARE' ? 'refinantare' : 'nou',
      requestedAmount: data.requestedAmount,
      requestedTermMonths: data.requestedTermMonths,
      purpose: data.purpose,
    };
    const response = await apiClient.post<Application>('/applications', request);
    return response.data;
  },

  async update(id: number, application: Partial<Application>): Promise<Application> {
    const response = await apiClient.put<Application>(`/applications/${id}`, application);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/applications/${id}`);
  },

  async getStatus(id: number): Promise<{ status: string }> {
    const response = await apiClient.get<{ status: string }>(`/applications/${id}/status`);
    return response.data;
  },
};
