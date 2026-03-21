import { DEFAULT_CONFIG } from './config';
import { calculateMaxLoanAmount, calculateMonthlyPayment, isInHighDtiWindow, pickNpApr } from './formulas';

export interface AdvancedCalcInput {
  loanType: 'NP' | 'IPOTECAR';
  avgSalary: number;
  mealTickets: number;
  ficoScore?: number;
  existingObligations: number;
  dpd30Count: number;
  dpd60Count: number;
  dpd90PlusCount: number;
  nonbankClosedLast4Y: number;
  nonbankActiveNow: number;
  termMonths: number;
  desiredAmount?: number;
  propertyValue?: number;
  isFirstHome?: boolean;
  incomeSource?: 'RO' | 'STRAINATATE';
}

export interface Reason {
  code: string;
  title: string;
  details?: string;
}

export interface RiskFlag {
  code: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  details?: string;
}

export interface AdvancedCalcResult {
  rating: 'GREEN' | 'YELLOW' | 'RED';
  confidence: string;
  reasons: Reason[];
  riskFlags: RiskFlag[];
  eligibleIncome: number;
  avgSalary: number;
  mealTickets: number;
  mealTicketWeight: number;
  ficoScore?: number;
  ficoInterpretation?: string;
  dtiUsed: number;
  dtiCapReason: string;
  existingObligations: number;
  maxMonthlyPayment: number;
  maxLoanAmount: number;
  maxLoanBestCase?: number;
  maxLoanWorstCase?: number;
  estimatedMonthlyPayment?: number;
  aprUsed: number;
  termMonths: number;
  lendersPool: string;
  fallbackLenders: string[];
  downpaymentPercent?: number;
  downpaymentAmount?: number;
  stressApr?: number;
  loanType: 'NP' | 'IPOTECAR';
}

export function calculateAdvanced(input: AdvancedCalcInput): AdvancedCalcResult {
  const cfg = DEFAULT_CONFIG;
  const reasons: Reason[] = [];
  const riskFlags: RiskFlag[] = [];

  const mealWeight = cfg.income.mealTicketWeightVerified;
  const eligibleIncome = input.avgSalary + input.mealTickets * mealWeight;

  if (input.loanType === 'NP') {
    return calcNp(input, cfg, eligibleIncome, mealWeight, reasons, riskFlags);
  }
  return calcMortgage(input, cfg, eligibleIncome, mealWeight, reasons, riskFlags);
}

function calcNp(
  input: AdvancedCalcInput,
  cfg: typeof DEFAULT_CONFIG,
  eligibleIncome: number,
  mealWeight: number,
  reasons: Reason[],
  riskFlags: RiskFlag[],
): AdvancedCalcResult {
  let dtiUsed = cfg.np.dtiStandard;
  let dtiCapReason = 'STANDARD';
  let lendersPool = 'STANDARD';
  let rating: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
  const fico = input.ficoScore;
  let ficoInterpretation: string | undefined;

  if (fico !== undefined && fico < cfg.np.ficoMinFallback) {
    rating = 'RED';
    riskFlags.push({ code: 'FICO_TOO_LOW', severity: 'HIGH', details: `Scor FICO ${fico} sub minimul de ${cfg.np.ficoMinFallback}. Necesita analiza manuala.` });
    ficoInterpretation = 'Scor foarte scazut — analiza manuala necesara';
  } else if (fico !== undefined && fico < cfg.np.ficoMinStandard) {
    lendersPool = 'FALLBACK';
    rating = 'YELLOW';
    reasons.push({ code: 'FICO_FALLBACK', title: 'Scor FICO moderat', details: `Scor ${fico} — eligibil doar la bancile: ${cfg.np.fallbackLenders.join(', ')}` });
    ficoInterpretation = 'Scor moderat — eligibil la banci selectate';
  } else if (fico !== undefined && fico >= cfg.np.ficoMinStandard) {
    reasons.push({ code: 'FICO_OK', title: 'Scor FICO bun', details: `Scor ${fico} — eligibil la toate bancile` });
    ficoInterpretation = fico >= 700 ? 'Scor excelent' : 'Scor bun — eligibil la toate bancile';
  }

  const inHighWindow = isInHighDtiWindow(new Date(), cfg.np.highDtiWindows);
  if (
    eligibleIncome >= cfg.np.incomeHighDtiMin &&
    fico !== undefined && fico >= cfg.np.ficoMinHighDti &&
    inHighWindow
  ) {
    dtiUsed = cfg.np.dtiHigh;
    dtiCapReason = 'HIGH_DTI_WINDOW';
    reasons.push({ code: 'DTI_HIGH', title: 'Grad indatorare 50%', details: `Venit >= ${cfg.np.incomeHighDtiMin} RON, FICO >= ${cfg.np.ficoMinHighDti}, fereastra trimestriala activa` });
  } else if (eligibleIncome >= cfg.np.incomeHighDtiMin && (!inHighWindow || (fico !== undefined && fico < cfg.np.ficoMinHighDti))) {
    reasons.push({ code: 'DTI_STANDARD_REASON', title: 'Grad indatorare standard 40%', details: !inHighWindow ? 'Fereastra trimestriala DTI 50% nu este activa' : `FICO ${fico} sub ${cfg.np.ficoMinHighDti} necesar pentru DTI 50%` });
  } else {
    reasons.push({ code: 'DTI_STANDARD', title: 'Grad indatorare standard 40%', details: `Venit sub ${cfg.np.incomeHighDtiMin} RON` });
  }

  dtiUsed = applyIfnRisk(input, cfg, dtiUsed, riskFlags);

  const maxPayment = Math.max(0, eligibleIncome * dtiUsed - input.existingObligations);
  const termMonths = Math.min(input.termMonths || cfg.np.maxTermMonths, cfg.np.maxTermMonths);
  const aprUsed = pickNpApr(cfg.np.aprMin, cfg.np.aprMax);
  const maxAmount = calculateMaxLoanAmount(maxPayment, aprUsed, termMonths);
  const bestCase = calculateMaxLoanAmount(maxPayment, cfg.np.aprMin, termMonths);
  const worstCase = calculateMaxLoanAmount(maxPayment, cfg.np.aprMax, termMonths);
  let estimatedPayment: number | undefined;
  if (input.desiredAmount) {
    estimatedPayment = calculateMonthlyPayment(input.desiredAmount, aprUsed, termMonths);
  }

  if (maxPayment <= 0) {
    rating = 'RED';
    riskFlags.push({ code: 'DTI_EXCEEDED', severity: 'HIGH', details: 'Nu exista spatiu de indatorare — obligatiile existente depasesc capacitatea de plata' });
  }

  if (input.existingObligations > 0) {
    reasons.push({ code: 'OBLIGATIONS', title: 'Obligatii existente deduse', details: `${fmt(input.existingObligations)} RON/luna din Raportul BC` });
  }

  if (rating === 'GREEN' && riskFlags.length > 0) rating = 'YELLOW';

  return {
    rating, confidence: 'HIGH', reasons, riskFlags,
    eligibleIncome, avgSalary: input.avgSalary, mealTickets: input.mealTickets, mealTicketWeight: mealWeight,
    ficoScore: fico, ficoInterpretation,
    dtiUsed, dtiCapReason, existingObligations: input.existingObligations, maxMonthlyPayment: maxPayment,
    maxLoanAmount: maxAmount, maxLoanBestCase: bestCase, maxLoanWorstCase: worstCase,
    estimatedMonthlyPayment: estimatedPayment,
    aprUsed, termMonths, lendersPool, fallbackLenders: lendersPool === 'FALLBACK' ? cfg.np.fallbackLenders : [],
    loanType: 'NP',
  };
}

function calcMortgage(
  input: AdvancedCalcInput,
  cfg: typeof DEFAULT_CONFIG,
  eligibleIncome: number,
  mealWeight: number,
  reasons: Reason[],
  riskFlags: RiskFlag[],
): AdvancedCalcResult {
  let dtiUsed = cfg.mortgage.dtiStandard;
  let dtiCapReason = 'STANDARD';
  let rating: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';

  if (eligibleIncome >= cfg.mortgage.incomeDtiHighMin) {
    dtiUsed = cfg.mortgage.dtiHighIncome;
    dtiCapReason = 'HIGH_INCOME';
    reasons.push({ code: 'DTI_HIGH', title: 'Grad indatorare 55%', details: `Venit >= ${cfg.mortgage.incomeDtiHighMin} RON` });
  } else {
    reasons.push({ code: 'DTI_STANDARD', title: 'Grad indatorare standard 40%', details: `Venit sub ${cfg.mortgage.incomeDtiHighMin} RON` });
  }

  if (input.dpd30Count > cfg.mortgage.bcRules.max30DpdLast4Y) {
    riskFlags.push({ code: 'DPD30_HIGH', severity: 'HIGH', details: `${input.dpd30Count} intarzieri 30+ zile (max admis: ${cfg.mortgage.bcRules.max30DpdLast4Y})` });
  }
  if (input.dpd60Count > cfg.mortgage.bcRules.max60DpdLast4Y) {
    riskFlags.push({ code: 'DPD60_HIGH', severity: 'HIGH', details: `${input.dpd60Count} intarzieri 60+ zile (max admis: ${cfg.mortgage.bcRules.max60DpdLast4Y})` });
  }
  if (input.dpd90PlusCount > 0) {
    rating = 'RED';
    riskFlags.push({ code: 'DPD90_BLOCK', severity: 'HIGH', details: `${input.dpd90PlusCount} intarzieri 90+ zile — necesita analiza manuala` });
  }

  dtiUsed = applyIfnRisk(input, cfg, dtiUsed, riskFlags);

  const isFirstHome = input.isFirstHome ?? true;
  const incomeSource = input.incomeSource ?? 'RO';
  let dpPercent: number;
  if (incomeSource === 'RO') {
    dpPercent = isFirstHome ? cfg.mortgage.downpayment.roFirstHome : cfg.mortgage.downpayment.roNotFirstHome;
  } else {
    dpPercent = cfg.mortgage.downpayment.foreignMin;
  }
  let dpAmount: number | undefined;
  if (input.propertyValue) {
    dpAmount = input.propertyValue * dpPercent;
    reasons.push({ code: 'DOWNPAYMENT', title: `Avans minim ${(dpPercent * 100).toFixed(0)}%`, details: `${fmt(dpAmount)} RON din valoarea imobilului` });
  }

  const maxPayment = Math.max(0, eligibleIncome * dtiUsed - input.existingObligations);
  const stressApr = cfg.mortgage.stressMarginDefault + cfg.ircc.current;
  const termMonths = input.termMonths || 360;
  const maxAmount = calculateMaxLoanAmount(maxPayment, stressApr, termMonths);

  if (maxPayment <= 0) {
    rating = 'RED';
    riskFlags.push({ code: 'DTI_EXCEEDED', severity: 'HIGH', details: 'Nu exista spatiu de indatorare' });
  }

  if (input.existingObligations > 0) {
    reasons.push({ code: 'OBLIGATIONS', title: 'Obligatii existente deduse', details: `${fmt(input.existingObligations)} RON/luna din Raportul BC` });
  }

  if (rating === 'GREEN' && riskFlags.length > 0) rating = 'YELLOW';

  return {
    rating, confidence: 'HIGH', reasons, riskFlags,
    eligibleIncome, avgSalary: input.avgSalary, mealTickets: input.mealTickets, mealTicketWeight: mealWeight,
    ficoScore: input.ficoScore,
    ficoInterpretation: input.ficoScore ? (input.ficoScore >= 700 ? 'Scor excelent' : input.ficoScore >= 500 ? 'Scor mediu' : 'Scor scazut') : undefined,
    dtiUsed, dtiCapReason, existingObligations: input.existingObligations, maxMonthlyPayment: maxPayment,
    maxLoanAmount: maxAmount,
    estimatedMonthlyPayment: input.desiredAmount ? calculateMonthlyPayment(input.desiredAmount, stressApr, termMonths) : undefined,
    aprUsed: stressApr, termMonths, lendersPool: 'STANDARD', fallbackLenders: [],
    downpaymentPercent: dpPercent, downpaymentAmount: dpAmount, stressApr,
    loanType: 'IPOTECAR',
  };
}

function applyIfnRisk(
  input: AdvancedCalcInput,
  cfg: typeof DEFAULT_CONFIG,
  dtiUsed: number,
  riskFlags: RiskFlag[],
): number {
  if (input.nonbankClosedLast4Y > cfg.riskFlags.ifnClosed4YGt && input.nonbankActiveNow > cfg.riskFlags.ifnActiveGt) {
    riskFlags.push({
      code: 'HIGH_IFN_EXPOSURE',
      severity: 'HIGH',
      details: `${input.nonbankClosedLast4Y} IFN-uri inchise si ${input.nonbankActiveNow} active — grad indatorare redus la ${(cfg.riskFlags.reducedDtiValue * 100).toFixed(0)}%`,
    });
    return Math.min(dtiUsed, cfg.riskFlags.reducedDtiValue);
  }
  return dtiUsed;
}

function fmt(v: number): string {
  return v.toLocaleString('ro-RO', { maximumFractionDigits: 0 });
}
