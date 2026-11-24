import axios from 'axios';
import { apiClient } from './apiClient';
import type { BankTiersResult, CommissionTierRow, TierCreditType } from '@/types/commission.types';

export type CommissionReportFormat = 'pdf' | 'xlsx';

async function blobError(err: unknown, fallback: string): Promise<Error> {
  if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      const message = (JSON.parse(await err.response.data.text()) as { message?: string }).message;
      if (message) return new Error(message);
    } catch {
      return new Error(fallback);
    }
  }
  return err instanceof Error && err.message ? err : new Error(fallback);
}

function fileNameFrom(disposition: unknown, fallback: string): string {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(String(disposition ?? ''));
  return match ? decodeURIComponent(match[1]) : fallback;
}

export const commissionApi = {
  async getTiers(bankId: number): Promise<BankTiersResult> {
    const { data } = await apiClient.get<BankTiersResult>(`/crm/banks/${bankId}/tiers`);
    return data;
  },
  async saveTiers(bankId: number, creditType: TierCreditType, tiers: CommissionTierRow[]): Promise<CommissionTierRow[]> {
    const { data } = await apiClient.put<CommissionTierRow[]>(`/crm/banks/${bankId}/tiers/${creditType}`, { tiers });
    return data;
  },
  async downloadReport(month: string, format: CommissionReportFormat, brokerId?: number): Promise<{ blob: Blob; fileName: string }> {
    try {
      const res = await apiClient.get<Blob>('/crm/reports/commission', { params: { month, format, brokerId }, responseType: 'blob' });
      return { blob: res.data, fileName: fileNameFrom(res.headers['content-disposition'], `raport-comisioane-${month}.${format}`) };
    } catch (err) {
      throw await blobError(err, 'Nu am putut genera raportul');
    }
  },
};
