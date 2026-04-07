import {apiClient} from './apiClient';

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

export interface BcIndicators {
  totalAccounts: number;
  participants: number;
  accountsWithArrears: number;
  totalMonthlyPayment: number;
  totalAmountOwed: number;
  totalArrears: number;
  contractsLast24Months: number;
}

export interface BcParsedData {
  ficoScore?: number;
  ficoExplanationCodes: string[];
  subjectName?: string;
  reportDate?: string;
  bankingIndicators?: BcIndicators;
  nonBankingIndicators?: BcIndicators;
  accounts: BcAccountSummary[];
  inquiries: BcInquiry[];
}

export interface BcReportSummary {
  id: number;
  ficoScore?: number;
  existingMonthlyObligations?: number;
  fileName?: string;
  createdAt: string;
  parsedData?: BcParsedData;
}

export const bcReportApi = {
  async getLatest(): Promise<BcReportSummary | null> {
    try {
      const response = await apiClient.get('/BcReport/latest');
      return response.data;
    } catch {
      return null;
    }
  },
};
