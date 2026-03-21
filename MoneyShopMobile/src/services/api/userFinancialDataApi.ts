import {apiClient} from './apiClient';

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

export const userFinancialDataApi = {
  async getMyData(): Promise<UserFinancialData> {
    const response = await apiClient.get<UserFinancialData>(
      '/userfinancialdata/my-data',
    );
    return response.data;
  },
};

