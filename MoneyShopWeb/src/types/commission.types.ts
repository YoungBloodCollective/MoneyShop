export type TierCreditType = 'NP' | 'IP';

export interface CommissionTierRow {
  from: number;
  to: number | null;
  percent: number;
}

export interface BankTiersResult {
  np: CommissionTierRow[];
  ip: CommissionTierRow[];
}

export interface BankTierStatus {
  creditType: TierCreditType;
  networkAmount: number;
  currentPercent?: number | null;
  currentFrom?: number | null;
  currentTo?: number | null;
  nextPercent?: number | null;
  nextFrom?: number | null;
  remainingToNext?: number | null;
}
