import { apiClient } from './apiClient';
import type {
  CrmDashboardSummary, CrmClientListItem, CrmClientDetail,
  CrmFileListItem, StatusTransitions, CrmIncomeInput, CrmIncomeSnapshot,
  CrmClientWork, CrmTaskItem, CrmBankFileItem, CrmBankFileInput, CrmWorkBoard,
} from '@/types/crm.types';

/** The broker's secret calendar subscription link (https and webcal forms). */
export interface CalendarFeedLink { url: string; webcalUrl: string }

export const crmApi = {
  async getCalendarFeed(): Promise<CalendarFeedLink> {
    const { data } = await apiClient.get<CalendarFeedLink>('/crm/calendar-feed');
    return data;
  },
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
  async getStatusTransitions(): Promise<StatusTransitions> {
    const { data } = await apiClient.get<StatusTransitions>('/crm/status-transitions');
    return data;
  },
  async uploadAnaf(userId: number, file: File): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    await apiClient.post(`/crm/clients/${userId}/anaf`, fd);
  },
  /** Broker uploads the client's Biroul de Credit report (PDF); it is parsed on upload. */
  async uploadBcReport(userId: number, file: File): Promise<{ ficoScore?: number | null; parseWarnings: string[] }> {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await apiClient.post(`/crm/clients/${userId}/bc-report`, fd);
    return data;
  },
  /** Income for the last 3 months, read off the client's ANAF document. */
  async saveIncome(userId: number, input: CrmIncomeInput): Promise<CrmIncomeSnapshot> {
    const { data } = await apiClient.put<CrmIncomeSnapshot>(`/crm/clients/${userId}/income`, input);
    return data;
  },
  async getAnafBlob(userId: number): Promise<Blob> {
    const { data } = await apiClient.get(`/crm/clients/${userId}/anaf`, { responseType: 'blob' });
    return data as Blob;
  },
  async bcReportPdfBlob(userId: number, reportId: number): Promise<Blob> {
    const { data } = await apiClient.get(`/crm/clients/${userId}/bc-report/${reportId}/pdf`, { responseType: 'blob' });
    return data as Blob;
  },
  // ── Broker follow-up on a client: tasks, bank files, labels ──
  async getClientWork(userId: number): Promise<CrmClientWork> {
    const { data } = await apiClient.get<CrmClientWork>(`/crm/clients/${userId}/work`);
    return data;
  },
  async getWorkBoard(): Promise<CrmWorkBoard> {
    const { data } = await apiClient.get<CrmWorkBoard>('/crm/work-board');
    return data;
  },
  async addTask(userId: number, title: string, dueAt: string): Promise<CrmTaskItem> {
    const { data } = await apiClient.post<CrmTaskItem>(`/crm/clients/${userId}/tasks`, { title, dueAt });
    return data;
  },
  async setTaskDone(taskId: number, done: boolean): Promise<CrmTaskItem> {
    const { data } = await apiClient.put<CrmTaskItem>(`/crm/tasks/${taskId}/done`, { done });
    return data;
  },
  async deleteTask(taskId: number): Promise<void> {
    await apiClient.delete(`/crm/tasks/${taskId}`);
  },
  async addBankFile(userId: number, input: CrmBankFileInput): Promise<CrmBankFileItem> {
    const { data } = await apiClient.post<CrmBankFileItem>(`/crm/clients/${userId}/bank-files`, input);
    return data;
  },
  async updateBankFile(id: number, input: CrmBankFileInput): Promise<CrmBankFileItem> {
    const { data } = await apiClient.put<CrmBankFileItem>(`/crm/bank-files/${id}`, input);
    return data;
  },
  async deleteBankFile(id: number): Promise<void> {
    await apiClient.delete(`/crm/bank-files/${id}`);
  },
  async setTags(userId: number, tags: string[]): Promise<string[]> {
    const { data } = await apiClient.put<string[]>(`/crm/clients/${userId}/tags`, { tags });
    return data;
  },
};
