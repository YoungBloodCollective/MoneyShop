import { apiClient } from './apiClient';
import type {
  CrmDashboardSummary, CrmClientListItem, CrmClientDetail,
  CrmFileListItem, CrmOfferItem,
} from '@/types/crm.types';

export const crmApi = {
  async getDashboard(): Promise<CrmDashboardSummary> {
    const { data } = await apiClient.get<CrmDashboardSummary>('/crm/dashboard');
    return data;
  },
  async getClients(): Promise<CrmClientListItem[]> {
    const { data } = await apiClient.get<CrmClientListItem[]>('/crm/clients');
    return data;
  },
  async getClient(userId: number): Promise<CrmClientDetail> {
    const { data } = await apiClient.get<CrmClientDetail>(`/crm/clients/${userId}`);
    return data;
  },
  async getFiles(): Promise<CrmFileListItem[]> {
    const { data } = await apiClient.get<CrmFileListItem[]>('/crm/files');
    return data;
  },
  async getOffers(): Promise<CrmOfferItem[]> {
    const { data } = await apiClient.get<CrmOfferItem[]>('/crm/offers');
    return data;
  },
  async uploadAnaf(userId: number, file: File): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    await apiClient.post(`/crm/clients/${userId}/anaf`, fd);
  },
  async getAnafBlob(userId: number): Promise<Blob> {
    const { data } = await apiClient.get(`/crm/clients/${userId}/anaf`, { responseType: 'blob' });
    return data as Blob;
  },
};
