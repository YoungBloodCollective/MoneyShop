import { apiClient } from './apiClient';

export interface CreditEntry {
  name: string;
  remainingAmount: number;
  monthsLeft: number;
  monthlyPayment: number;
}

export interface UserFinancialData {
  isEmpty?: boolean;
  ficoScore?: number;
  salariu1?: number;
  salariu2?: number;
  salariu3?: number;
  salariuNet?: number;
  bonuriMasa?: boolean;
  sumaBonuriMasa?: number;
  venitTotal?: number;
  credits?: CreditEntry[];
  soldTotal?: number;
  rataTotalaLunara?: number;
  nrCrediteBanci?: number;
  nrIfn?: number;
  poprire?: boolean;
  intarzieri?: boolean;
  intarzieriNumar?: number;
  dti?: number;
  scoringLevel?: string;
  recommendedLevel?: string;
  lastUpdated?: string;
}

export interface SaveFinancialDataRequest {
  salariu1?: number;
  salariu2?: number;
  salariu3?: number;
  bonuriMasa?: boolean;
  sumaBonuriMasa?: number;
  credits: CreditEntry[];
}

export const userFinancialDataApi = {
  async getMyData(): Promise<UserFinancialData> {
    const response = await apiClient.get<UserFinancialData>(
      '/userfinancialdata/my-data',
    );
    return response.data;
  },

  async saveMyData(data: SaveFinancialDataRequest): Promise<void> {
    await apiClient.put('/userfinancialdata/my-data', data);
  },
};
