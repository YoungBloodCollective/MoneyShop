import type { AcordFileInfo, AcordOcrSnapshot, BankConsentInfo } from '@/services/api/acordApi';

export interface CrmStatusSlice {
  key: string;
  label: string;
  count: number;
}

export interface CrmDayCount {
  date: string;
  count: number;
}

export interface CrmActivity {
  title: string;
  at: string;
  kind: 'acord' | 'dosar' | 'oferta' | 'document';
}

export interface CrmTask {
  label: string;
  count: number;
  severity: 'info' | 'warning' | 'danger';
  kind: 'documents' | 'approval' | 'acord' | 'birthday';
}

export interface CrmDashboardSummary {
  activeClients: number;
  activeClientsDeltaPct: number;
  filesInProgress: number;
  approvedThisMonth: number;
  creditVolume: number;
  statusBreakdown: CrmStatusSlice[];
  evolution: CrmDayCount[];
  recentActivities: CrmActivity[];
  tasks: CrmTask[];
}

export interface CrmClientListItem {
  userId: number;
  fullName: string;
  phone?: string;
  email?: string;
  filesCount: number;
  lastStatus?: string | null;
  lastActivityAt: string;
  approvedVolume: number;
  hasAcord: boolean;
  acordId?: string | null;
  acordStatus?: string | null;
  acordSignedAt?: string | null;
  acordCreatedAt?: string | null;
  /** Broker labels: PROBLEME_BC, DE_REVENIT, DTI. */
  tags?: string[];
  /** Stage of the most recently changed bank file. */
  bankFileStatus?: string | null;
}

export interface CrmFinancialSnapshot {
  salariuNet?: number;
  vechimeLuni?: number;
  nrCrediteBanci?: number;
  soldTotal?: number;
  dti?: number;
  scoring?: number;
  recommendedLevel?: string;
}

export interface CrmClientFile {
  id: number;
  code: string;
  status: string;
  typeCredit?: string;
  requestedAmount?: number;
  requestedTermMonths?: number;
  sumaAprobata?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrmClientDocument {
  id: number;
  docType: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}

export interface CrmKycSnapshot {
  status: string;
  hasIdFront: boolean;
  hasIdBack: boolean;
  hasSelfie: boolean;
  hasProofOfAddress: boolean;
  livenessPassed?: boolean;
  faceMatchPassed?: boolean;
}

export interface CrmAcordSnapshot {
  acordId: string;
  nume: string;
  prenume: string;
  telefon: string;
  status: string;
  createdAt: string;
  signedAt?: string | null;
  completedAt?: string | null;
  tipAct?: string | null;
  marketingAccepted?: boolean | null;
  oug52Waived?: boolean | null;
  reviewNote?: string | null;
  cnpMasked?: string | null;
  cnpAvailable: boolean;
  address?: string | null;
  livenessPassed?: boolean | null;
  faceMatchPassed?: boolean | null;
  automaticChecksRan: boolean;
  ocr?: AcordOcrSnapshot | null;
  files: AcordFileInfo[];
  bankConsents: BankConsentInfo[];
}

export interface CrmBcAccount {
  creditor?: string | null;
  accountType?: string | null;
  status?: string | null;
  currency?: string | null;
  currentBalance: number;
  arrearsAmount: number;
  daysOverdue: number;
  isActive: boolean;
}

export interface CrmBcReportSnapshot {
  id: number;
  fileName?: string | null;
  uploadedAt: string;
  reportDate?: string | null;
  ficoScore?: number | null;
  existingMonthlyObligations?: number | null;
  /** Monthly instalments / balance owed to banks and to non-bank lenders (IFN). */
  bankMonthlyPayment: number;
  nonBankMonthlyPayment: number;
  bankAmountOwed: number;
  nonBankAmountOwed: number;
  totalAccounts: number;
  activeAccounts: number;
  accountsWithArrears: number;
  totalAmountOwed: number;
  totalArrears: number;
  maxCurrentDelay?: string | null;
  inquiriesCount: number;
  dpd30Count?: number | null;
  dpd60Count?: number | null;
  dpd90PlusCount?: number | null;
  nonbankActiveNow?: number | null;
  hasPdf: boolean;
  parseWarnings: string[];
  accounts: CrmBcAccount[];
}

export interface CrmClientDetail {
  userId: number;
  fullName: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  acordId?: string | null;
  acordStatus?: string | null;
  acordSignedAt?: string | null;
  acordCreatedAt?: string | null;
  financial?: CrmFinancialSnapshot | null;
  files: CrmClientFile[];
  documents: CrmClientDocument[];
  kyc?: CrmKycSnapshot;
  acord?: CrmAcordSnapshot | null;
  bcReport?: CrmBcReportSnapshot | null;
  canAttachAnaf: boolean;
  anafFileName?: string;
  anafUploadedAt?: string;
  /** Income the broker entered from the ANAF document. */
  income?: CrmIncomeSnapshot | null;
}

export interface CrmIncomeInput {
  salariu1?: number | null;
  salariu2?: number | null;
  salariu3?: number | null;
  bonuriMasa?: number | null;
}

export interface CrmIncomeSnapshot extends CrmIncomeInput {
  /** Average of the salaries entered. */
  salariuNet?: number | null;
  /** salariuNet + meal tickets. */
  venitTotal?: number | null;
  /** Monthly instalments from the latest BC report. */
  rataTotalaLunara?: number | null;
  /** rataTotalaLunara / venitTotal (0.35 = 35%). */
  dti?: number | null;
  updatedAt: string;
}

export interface CrmFileListItem {
  id: number;
  code: string;
  userId: number;
  clientName: string;
  status: string;
  typeCredit?: string;
  requestedAmount?: number;
  sumaAprobata?: number;
  comision?: number;
  dataDisbursare?: string;
  createdAt: string;
  updatedAt: string;
}

export type StatusTransitions = Record<string, string[]>;

/** A to-do the broker set on a client, with a reminder email at dueAt. */
export interface CrmTaskItem {
  id: number;
  userId: number;
  clientName?: string | null;
  title: string;
  dueAt: string;
  doneAt?: string | null;
  createdAt: string;
}

/** A loan file submitted to a bank, tracked through the bank's stages. */
export interface CrmBankFileItem {
  id: number;
  userId: number;
  clientName?: string | null;
  bankName: string;
  amount: number;
  status: string;
  statusChangedAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmBankFileInput {
  bankName: string;
  amount: number;
  status: string;
  notes?: string | null;
}

export interface CrmClientWork {
  tasks: CrmTaskItem[];
  bankFiles: CrmBankFileItem[];
  tags: string[];
}

export interface CrmWorkBoard {
  bankFiles: CrmBankFileItem[];
  openTasks: CrmTaskItem[];
}

/** A document the broker filed in the client's folder (metadata only). */
export interface ClientDocumentInfo {
  id: number;
  userId: number;
  folder: 'ACORD' | 'VENITURI' | 'BC' | 'BANCA' | 'ALTELE';
  bankName?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}
