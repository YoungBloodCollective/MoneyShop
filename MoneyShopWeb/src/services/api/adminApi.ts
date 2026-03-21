import { apiClient } from './apiClient';
import type { Application } from '@/types/application.types';

// Admin-specific types
export interface MonthlyReportItem {
  id: number;
  clientName: string;
  typeCredit?: string;
  bankName?: string;
  sumaAprobata?: number;
  comision?: number;
  dataDisbursare?: string;
}

export interface DisbursementRequest {
  sumaAprobata?: number;
  comision?: number;
  dataDisbursare?: string;
}

export interface ExportReportRequest {
  startDate?: string;
  endDate?: string;
  bankName?: string;
  typeCredit?: string;
}

export interface MonthlyReportParams {
  month: number;
  year: number;
  bankName?: string;
  typeCredit?: string;
  status?: string;
}

export const adminApi = {
  /**
   * Get all applications (admin only)
   * GET /api/admin/applications?status=&typeCredit=
   */
  async getApplications(filters?: { status?: string; typeCredit?: string }): Promise<Application[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.typeCredit) params.set('typeCredit', filters.typeCredit);
      const query = params.toString();
      const response = await apiClient.get<Application[]>(`/admin/applications${query ? `?${query}` : ''}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching admin applications:', error);
      return [];
    }
  },

  /**
   * Update application status (admin only)
   * PUT /api/admin/applications/{id}/status
   */
  async updateStatus(id: number, status: string): Promise<void> {
    await apiClient.put(`/admin/applications/${id}/status`, { status });
  },

  /**
   * Update disbursement info (admin only)
   * PUT /api/admin/applications/{id}/disbursement
   */
  async updateDisbursement(id: number, data: DisbursementRequest): Promise<void> {
    await apiClient.put(`/admin/applications/${id}/disbursement`, data);
  },

  /**
   * Get monthly report (admin only)
   * GET /api/admin/reports/monthly?month=&year=&bankName=&typeCredit=&status=
   */
  async getMonthlyReport(params: MonthlyReportParams): Promise<MonthlyReportItem[]> {
    try {
      const query = new URLSearchParams();
      query.set('month', params.month.toString());
      query.set('year', params.year.toString());
      if (params.bankName) query.set('bankName', params.bankName);
      if (params.typeCredit) query.set('typeCredit', params.typeCredit);
      if (params.status) query.set('status', params.status);
      const response = await apiClient.get<MonthlyReportItem[]>(`/admin/reports/monthly?${query.toString()}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      return [];
    }
  },

  /**
   * Export report data (admin only)
   * POST /api/admin/reports/export
   */
  async exportReport(request: ExportReportRequest): Promise<MonthlyReportItem[]> {
    try {
      const response = await apiClient.post<MonthlyReportItem[]>('/admin/reports/export', request);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error exporting report:', error);
      return [];
    }
  },
};
