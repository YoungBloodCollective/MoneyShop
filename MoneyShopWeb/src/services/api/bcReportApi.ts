import { apiClient } from './apiClient';

export interface BcIndicators {
  accountsInfo?: string;
  totalAccounts: number;
  participants: number;
  accountsWithArrears: number;
  oldestInfo?: string;
  offBalanceSheet: number;
  sentToCollection: number;
  totalMonthlyPayment: number;
  totalAmountOwed: number;
  amountOwedUnder1Year: number;
  amountOwed1To5Years: number;
  amountOwedOver5Years: number;
  totalArrears: number;
  maxCurrentDelay?: string;
  contractsLast24Months: number;
  closedLast24Months: number;
  closedOnTime: number;
  closedEarly: number;
  closedOther: number;
  maxPaidInMonth24: number;
  accountsWithArrearsLast6M: number;
  accountsUpdatedLast6M: number;
  mostRecentInquiry?: string;
}

export interface BcAccountSummary {
  accountIndex: number;
  accountType?: string;
  status?: string;
  currency?: string;
  creditLimit: number;
  currentBalance: number;
  arrearsAmount: number;
  lastUpdateDate?: string;
  creditor?: string;
  daysOverdue: number;
  isActive: boolean;
  hasArrears: boolean;
}

export interface BcInquiry {
  date?: string;
  institution?: string;
  purpose?: string;
}

export interface BcParsedData {
  ficoScore?: number;
  ficoExplanationCodes: string[];
  subjectName?: string;
  subjectCnp?: string;
  reportDate?: string;
  bankingIndicators?: BcIndicators;
  nonBankingIndicators?: BcIndicators;
  accounts: BcAccountSummary[];
  inquiries: BcInquiry[];
}

export interface BcReportUploadResult {
  reportId: number;
  ficoScore?: number;
  totalAccounts: number;
  activeAccounts: number;
  accountsWithArrears: number;
  totalMonthlyObligations: number;
  totalAmountOwed: number;
  totalArrears: number;
  parseWarnings: string[];
  parsedData?: BcParsedData;
}

export interface BcReportSummaryDto {
  id: number;
  ficoScore?: number;
  existingMonthlyObligations?: number;
  dpd30Count?: number;
  dpd60Count?: number;
  dpd90PlusCount?: number;
  nonbankClosedLast4Years?: number;
  nonbankActiveNow?: number;
  fileName?: string;
  createdAt: string;
  parsedAt?: string;
  parsedData?: BcParsedData;
  parseWarnings: string[];
}

export const bcReportApi = {
  upload: async (file: File): Promise<BcReportUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/BcReport/upload', formData);
    return response.data;
  },

  getLatest: async (): Promise<BcReportSummaryDto | { isEmpty: true }> => {
    const response = await apiClient.get('/BcReport/latest');
    return response.data;
  },

  getById: async (id: number): Promise<BcReportSummaryDto> => {
    const response = await apiClient.get(`/BcReport/${id}`);
    return response.data;
  },
};
