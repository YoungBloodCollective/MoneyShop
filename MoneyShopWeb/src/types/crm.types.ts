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
