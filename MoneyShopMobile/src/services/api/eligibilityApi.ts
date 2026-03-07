import axios from 'axios';
import {API_BASE_URL} from '../../utils/constants';

export interface CalcSimpleRequest {
  loanType: 'NP' | 'IPOTECAR' | 'REFINANTARE';
  currency?: string;
  salaryNetUser: number;
  mealTicketsUser?: number;
  termMonths?: number;
  desiredAmount?: number;
  propertyValue?: number;
  hasOwnedHomeBefore?: boolean;
  incomeSource?: 'RO' | 'STRAINATATE';
  foreignIncomeNetEur?: number;
  downPaymentPercentSelected?: number;
}

export interface EligibilityResponse {
  requestId: string;
  mode: string;
  loanType: string;
  currency: string;
  status: string;
  decision: {
    rating: string;
    confidence: string;
    reasons: Array<{
      code: string;
      title: string;
      details?: string;
    }>;
    riskFlags: Array<{
      code: string;
      severity: string;
      details?: string;
    }>;
  };
  income: {
    eligibleIncomeMonthly: number;
    salaryNetMonthly?: number;
    mealTicketsMonthly?: number;
    mealTicketWeightUsed?: number;
    source: string;
    periodMonths?: number;
  };
  dti: {
    dtiUsed: number;
    dtiCapReason: string;
    existingMonthlyObligations: number;
    maxMonthlyPayment: number;
  };
  rates: {
    np?: {
      aprMin: number;
      aprMax: number;
      aprUsedForCalc: number;
      termMonthsUsed: number;
    };
    mortgage?: {
      promoFixed3YMin: number;
      promoFixed3YMax: number;
      irccCurrent: number;
      bankMarginUsed: number;
      underwritingRateUsed: number;
      termMonthsUsed: number;
    };
  };
  offers: {
    maxLoanAmountRange?: {
      bestCase: number;
      worstCase: number;
    };
    maxLoanAmountUsed?: number;
    estimatedMonthlyPayment?: number;
    affordability: {
      paymentMax: number;
      notes: string[];
    };
  };
  routing: {
    lendersPool: string;
    recommendedLenders: string[];
    notes: string[];
  };
  meta: {
    configVersion: string;
    calculatedAt: string;
  };
}

export const eligibilityApi = {
  calculateSimple: async (
    request: CalcSimpleRequest,
  ): Promise<EligibilityResponse> => {
    const response = await axios.post<EligibilityResponse>(
      `${API_BASE_URL}/eligibility/simple`,
      request,
    );
    return response.data;
  },
};

