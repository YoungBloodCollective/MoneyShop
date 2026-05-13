import { apiClient } from './apiClient';
import type {
  BrokerUser,
  BrokerProfile,
  BrokerLead,
  BrokerDosar,
  BrokerNotification,
  BrokerStats,
  BrokerDashboardData,
  PipelineColumn,
  MonthlyData,
} from '@/types/broker.types';

export const brokerAuthApi = {
  async register(data: {
    nume: string;
    prenume?: string;
    email: string;
    password: string;
    telefon: string;
    firma?: string;
    cui?: string;
    judet?: string;
    oras?: string;
  }): Promise<{ token: string; user: BrokerUser }> {
    const r = await apiClient.post<{ token: string; user: BrokerUser }>('/broker-auth/register', data);
    return r.data;
  },

  async login(email: string, password: string): Promise<{ token: string; user: BrokerUser }> {
    const r = await apiClient.post<{ token: string; user: BrokerUser }>('/broker-auth/login', { email, password });
    return r.data;
  },

  async me(): Promise<BrokerUser> {
    const r = await apiClient.get<BrokerUser>('/broker-auth/me');
    return r.data;
  },

  async selectPlan(plan: 'Basic' | 'Full'): Promise<void> {
    await apiClient.patch('/broker-auth/plan', { plan });
  },
};

export const brokerProfileApi = {
  async get(): Promise<BrokerProfile> {
    const r = await apiClient.get<BrokerProfile>('/broker-profile');
    return r.data;
  },

  async update(data: Partial<BrokerProfile>): Promise<BrokerProfile> {
    const r = await apiClient.put<BrokerProfile>('/broker-profile', data);
    return r.data;
  },

  async getSlug(): Promise<{ slug: string; link: string }> {
    const r = await apiClient.get<{ slug: string; link: string }>('/broker-profile/slug');
    return r.data;
  },

  async updateSlug(slug: string): Promise<{ slug: string; link: string }> {
    const r = await apiClient.patch<{ slug: string; link: string }>('/broker-profile/slug', { slug });
    return r.data;
  },

  async getStats(): Promise<BrokerStats> {
    const r = await apiClient.get<BrokerStats>('/broker-profile/stats');
    return r.data;
  },

  async getNotifications(unreadOnly = false): Promise<BrokerNotification[]> {
    const r = await apiClient.get<BrokerNotification[]>('/broker-profile/notifications', { params: { unreadOnly } });
    return r.data;
  },

  async markAllRead(): Promise<void> {
    await apiClient.patch('/broker-profile/notifications/read-all');
  },
};

export const brokerLeadsApi = {
  async getAll(params?: { status?: string; search?: string }): Promise<BrokerLead[]> {
    const r = await apiClient.get<BrokerLead[]>('/broker-leads', { params });
    return r.data;
  },

  async getById(id: number): Promise<BrokerLead> {
    const r = await apiClient.get<BrokerLead>(`/broker-leads/${id}`);
    return r.data;
  },

  async updateStatus(id: number, status: string, note?: string): Promise<void> {
    await apiClient.patch(`/broker-leads/${id}/status`, { status, note });
  },

  async updateNote(id: number, note: string): Promise<void> {
    await apiClient.patch(`/broker-leads/${id}/note`, { note });
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/broker-leads/${id}`);
  },
};

export const brokerDosareApi = {
  async getAll(params?: { status?: string; search?: string }): Promise<BrokerDosar[]> {
    const r = await apiClient.get<BrokerDosar[]>('/broker-dosare', { params });
    return r.data;
  },

  async getPipeline(): Promise<PipelineColumn[]> {
    const r = await apiClient.get<PipelineColumn[]>('/broker-dosare/pipeline');
    return r.data;
  },

  async getById(id: number): Promise<BrokerDosar> {
    const r = await apiClient.get<BrokerDosar>(`/broker-dosare/${id}`);
    return r.data;
  },

  async create(data: {
    brokerLeadId?: number;
    numeClient: string;
    telefonClient: string;
    emailClient?: string;
    tipCredit?: string;
    bancaTinta?: string;
    sumaSolicitata?: number;
    durataMasuri?: number;
    note?: string;
    terminLimita?: string;
  }): Promise<{ id: number; message: string }> {
    const r = await apiClient.post<{ id: number; message: string }>('/broker-dosare', data);
    return r.data;
  },

  async update(id: number, data: Partial<BrokerDosar>): Promise<void> {
    await apiClient.put(`/broker-dosare/${id}`, data);
  },

  async updateStatus(id: number, status: string, comentariu?: string): Promise<void> {
    await apiClient.patch(`/broker-dosare/${id}/status`, { status, comentariu });
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/broker-dosare/${id}`);
  },
};

export const brokerReportsApi = {
  async dashboard(): Promise<BrokerDashboardData> {
    const r = await apiClient.get<BrokerDashboardData>('/broker-reports/dashboard');
    return r.data;
  },

  async monthly(months = 6): Promise<MonthlyData[]> {
    const r = await apiClient.get<MonthlyData[]>('/broker-reports/monthly', { params: { months } });
    return r.data;
  },

  async conversionFunnel(): Promise<{ etape: Array<{ etapa: string; valoare: number }> }> {
    const r = await apiClient.get('/broker-reports/conversion-funnel');
    return r.data;
  },
};

export const brokerAdminApi = {
  async getBrokers(params?: { status?: string; plan?: string }): Promise<any[]> {
    const r = await apiClient.get<any[]>('/broker-admin/brokers', { params });
    return r.data;
  },

  async getBroker(id: number): Promise<any> {
    const r = await apiClient.get<any>(`/broker-admin/brokers/${id}`);
    return r.data;
  },

  async updateStatus(id: number, status: string): Promise<void> {
    await apiClient.patch(`/broker-admin/brokers/${id}/status`, { status });
  },

  async setPlan(id: number, plan: string, monthsExtension?: number): Promise<void> {
    await apiClient.patch(`/broker-admin/brokers/${id}/plan`, { plan, monthsExtension });
  },

  async getStats(): Promise<any> {
    const r = await apiClient.get<any>('/broker-admin/stats');
    return r.data;
  },
};

export const publicApplyApi = {
  async getBrokerProfile(slug: string): Promise<{
    slug: string;
    name: string;
    photo?: string;
    bio?: string;
    firma?: string;
    judet?: string;
    phone?: string;
  }> {
    const r = await apiClient.get(`/public/broker/${slug}`);
    return r.data;
  },

  async apply(slug: string, data: {
    nume: string;
    prenume?: string;
    telefon: string;
    email?: string;
    judet?: string;
    oras?: string;
    tipCredit?: string;
    salariuNet?: number;
    sumaDorita?: number;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }): Promise<{ message: string; leadId: number }> {
    const r = await apiClient.post<{ message: string; leadId: number }>(`/public/apply/${slug}`, data);
    return r.data;
  },
};
