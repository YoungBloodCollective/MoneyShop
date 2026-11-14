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

export interface CrmOfferItem {
  applicationId: number;
  fileCode: string;
  clientName: string;
  bankName: string;
  commissionPercent: number;
  requestedAmount?: number;
  status: string;
  createdAt: string;
}
