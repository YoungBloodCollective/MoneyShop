export interface Application {
  id: number;
  userId: number;
  status: string;
  typeCredit?: string;
  tipOperatiune?: string;
  requestedAmount?: number;
  requestedTermMonths?: number;
  purpose?: string;
  salariuNet?: number;
  bonuriMasa?: boolean;
  sumaBonuriMasa?: number;
  vechimeLuni?: number;
  nrCrediteBanci?: number;
  listaBanciActive?: string;
  nrIfn?: number;
  poprire?: boolean;
  soldTotal?: number;
  intarzieri?: boolean;
  intarzieriNumar?: number;
  cardCredit?: string;
  overdraft?: string;
  codebitori?: string;
  scoring?: number;
  dti?: number;
  recommendedLevel?: string;
  sumaAprobata?: number;
  comision?: number;
  dataDisbursare?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationRequest {
  typeCredit: string;
  tipOperatiune?: string;
  requestedAmount: number;
  requestedTermMonths: number;
  purpose?: string;
}

export interface CardCreditData {
  banca: string;
  limita: number;
}

export interface OverdraftData {
  banca: string;
  limita: number;
}

export interface CodebitorData {
  nume: string;
  venit: number;
  relatie: string;
  nrCredite: number;
  ifn: number;
}

export interface ScoringRequest {
  salariuNet: number;
  bonuriMasa?: boolean;
  sumaBonuriMasa?: number;
  vechimeLuni?: number;
  nrCrediteBanci?: number;
  nrIfn?: number;
  poprire?: boolean;
  soldTotal?: number;
  intarzieri?: boolean;
  intarzieriNumar?: number;
  cardCredit?: string;
  overdraft?: string;
  codebitori?: string;
}

export interface ScoringResult {
  dti: number;
  scoringLevel: string;
  recommendedLevel: string;
  reasoning: string[];
}
