import { apiClient } from './apiClient';

export interface BrokerInfo {
  brokerId: string;
  fullName: string;
  firmName?: string;
  firmCui?: string;
  publicEmail?: string;
  publicPhone?: string;
  status: string;
}

export interface BrokerDirectoryInfo {
  directoryId: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  notes?: string;
}

export const brokerApi = {
  async uploadExcel(file: File, notes?: string): Promise<{
    directoryId: number;
    fileName: string;
    uploadedAt: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) {
      formData.append('notes', notes);
    }

    const response = await apiClient.post<{
      directoryId: number;
      fileName: string;
      uploadedAt: string;
    }>('/broker/upload-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      transformRequest: () => formData,
    });

    return response.data;
  },

  async getLatestDirectory(): Promise<BrokerDirectoryInfo | null> {
    try {
      const response = await apiClient.get<BrokerDirectoryInfo>('/broker/directory/latest');
      return response.data;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          return null;
        }
      }
      throw error;
    }
  },

  async searchBrokers(search?: string, limit?: number): Promise<{
    brokers: BrokerInfo[];
    count: number;
  }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get<{
      brokers: BrokerInfo[];
      count: number;
    }>(`/broker/search?${params.toString()}`);
    return response.data;
  },
};
