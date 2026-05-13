export interface BrokerProfile {
  id: number;
  userId: number;
  slug: string;
  bio?: string;
  photoUrl?: string;
  plan: 'Trial' | 'Basic' | 'Full';
  status: 'Active' | 'Pending' | 'Suspended' | 'Rejected';
  isActive: boolean;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  anafQueriesUsed: number;
  anafQueriesLimit: number;
  bcQueriesUsed: number;
  bcQueriesLimit: number;
  firma?: string;
  cui?: string;
  website?: string;
  judet?: string;
  oras?: string;
  createdAt: string;
}

export interface BrokerUser {
  id: number;
  email: string;
  name: string;
  role: 'Broker';
  emailVerified: boolean;
  phoneVerified: boolean;
  phone?: string;
  brokerProfile: BrokerProfile;
}

export interface BrokerLead {
  id: number;
  brokerProfileId: number;
  nume: string;
  prenume?: string;
  telefon: string;
  email?: string;
  judet?: string;
  oras?: string;
  tipCredit?: string;
  salariuNet?: number;
  sumaDorita?: number;
  status: LeadStatus;
  note?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: string;
  updatedAt: string;
  dosareCount?: number;
}

export type LeadStatus =
  | 'Nou'
  | 'Contactat'
  | 'Interesat'
  | 'Dosar deschis'
  | 'Neinteresat'
  | 'Nu raspunde';

export interface BrokerDosar {
  id: number;
  brokerProfileId: number;
  brokerLeadId?: number;
  numeClient: string;
  telefonClient: string;
  emailClient?: string;
  tipCredit: string;
  bancaTinta?: string;
  sumaSolicitata?: number;
  durataMasuri?: number;
  rataLunaraEstimata?: number;
  status: DosarStatus;
  note?: string;
  terminLimita?: string;
  rezultatBanca?: string;
  sumaAprobata?: number;
  createdAt: string;
  updatedAt: string;
  brokerLead?: BrokerLead;
  documents?: BrokerDocument[];
  statusHistory?: BrokerStatusHistoryItem[];
  documentsCount?: number;
}

export type DosarStatus =
  | 'Nou'
  | 'Analiza ANAF/BC'
  | 'Pregatire dosar'
  | 'Trimis la banca'
  | 'Analiza banca'
  | 'Aprobare conditionata'
  | 'Aprobat'
  | 'Contractat'
  | 'Respins'
  | 'Retras';

export interface BrokerDocument {
  id: number;
  brokerDosarId: number;
  categorie: string;
  fileName: string;
  mimeType: string;
  azureBlobPath?: string;
  note?: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface BrokerStatusHistoryItem {
  id: number;
  statusVechi: string;
  statusNou: string;
  comentariu?: string;
  changedByUserId: number;
  createdAt: string;
}

export interface BrokerNotification {
  id: number;
  brokerProfileId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityId?: number;
  relatedEntityType?: string;
  createdAt: string;
}

export interface BrokerStats {
  leadsTotal: number;
  leadsThisMonth: number;
  dosareActive: number;
  dosareAprobate: number;
  dosareTotal: number;
  notificariNecitite: number;
  rataConversie: number;
  plan: string;
  anafQueriesUsed: number;
  anafQueriesLimit: number;
  bcQueriesUsed: number;
  bcQueriesLimit: number;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
}

export interface BrokerDashboardData {
  leadsThisMonth: number;
  leadsLastMonth: number;
  dosareActive: number;
  dosareAprobateThisMonth: number;
  dosareAprobateTotal: number;
  dosareTotal: number;
  sumaAprobataThisMonth: number;
  rataConversie: number;
  leadsPerStatus: Array<{ status: string; count: number }>;
  dosarePerStatus: Array<{ status: string; count: number }>;
  dosarePerTip: Array<{ tip: string; count: number }>;
}

export interface PipelineColumn {
  status: DosarStatus;
  items: BrokerDosar[];
}

export interface MonthlyData {
  luna: string;
  an: number;
  luna_nr: number;
  leads: number;
  dosareCreate: number;
  dosareAprobate: number;
}
