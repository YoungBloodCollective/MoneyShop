export interface HighDtiWindow {
  start: string;
  end: string;
}

export interface RatesRulesConfig {
  version: string;
  ircc: { current: number; next: number };
  income: { mealTicketWeightSimple: number; mealTicketWeightVerified: number };
  np: {
    maxTermMonths: number;
    aprMin: number;
    aprMax: number;
    dtiStandard: number;
    dtiHigh: number;
    incomeHighDtiMin: number;
    ficoMinStandard: number;
    ficoMinHighDti: number;
    ficoMinFallback: number;
    highDtiWindows: HighDtiWindow[];
    fallbackLenders: string[];
  };
  mortgage: {
    promoFixedMin: number;
    promoFixedMax: number;
    stressMarginDefault: number;
    dtiStandard: number;
    dtiHighIncome: number;
    incomeDtiHighMin: number;
    downpayment: {
      roFirstHome: number;
      roNotFirstHome: number;
      foreignIncomeMinEur: number;
      foreignMin: number;
      foreignMax: number;
    };
    bcRules: {
      max30DpdLast4Y: number;
      max60DpdLast4Y: number;
      any90DpdLast4Y: string;
    };
  };
  riskFlags: {
    ifnClosed4YGt: number;
    ifnActiveGt: number;
    action: string;
    reducedDtiValue: number;
  };
}

export const DEFAULT_CONFIG: RatesRulesConfig = {
  version: '2026-01-05-default',
  ircc: { current: 5.68, next: 5.58 },
  income: { mealTicketWeightSimple: 1.0, mealTicketWeightVerified: 0.5 },
  np: {
    maxTermMonths: 60,
    aprMin: 7.49,
    aprMax: 15.99,
    dtiStandard: 0.40,
    dtiHigh: 0.50,
    incomeHighDtiMin: 5500,
    ficoMinStandard: 581,
    ficoMinHighDti: 601,
    ficoMinFallback: 500,
    highDtiWindows: [
      { start: '2026-01-02', end: '2026-01-06' },
      { start: '2026-04-01', end: '2026-04-06' },
      { start: '2026-07-01', end: '2026-07-06' },
      { start: '2026-10-01', end: '2026-10-06' },
    ],
    fallbackLenders: ['GARANTI', 'BRD', 'ING'],
  },
  mortgage: {
    promoFixedMin: 4.79,
    promoFixedMax: 5.99,
    stressMarginDefault: 2.49,
    dtiStandard: 0.40,
    dtiHighIncome: 0.55,
    incomeDtiHighMin: 6500,
    downpayment: {
      roFirstHome: 0.15,
      roNotFirstHome: 0.25,
      foreignIncomeMinEur: 2000,
      foreignMin: 0.25,
      foreignMax: 0.40,
    },
    bcRules: {
      max30DpdLast4Y: 4,
      max60DpdLast4Y: 1,
      any90DpdLast4Y: 'manual_review',
    },
  },
  riskFlags: {
    ifnClosed4YGt: 10,
    ifnActiveGt: 4,
    action: 'manual_review',
    reducedDtiValue: 0.35,
  },
};
