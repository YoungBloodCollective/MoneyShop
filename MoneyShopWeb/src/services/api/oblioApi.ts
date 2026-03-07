import { apiClient } from './apiClient';

export interface OblioCompany {
  cif: string;
  company: string;
  userTypeAccess: string;
}

export interface OblioVatRate {
  name: string;
  percent: number;
  default: boolean;
}

export interface OblioClient {
  cif: string;
  name: string;
  rc?: string;
  code?: string;
  address?: string;
  state?: string;
  city?: string;
  country?: string;
  iban?: string;
  bank?: string;
  email?: string;
  phone?: string;
  contact?: string;
  vatPayer: boolean;
}

export interface OblioProduct {
  name: string;
  code?: string;
  management?: string;
  workStation?: string;
  stock?: number;
  unit?: string;
  price: number;
  vatPercentage: number;
}

export interface OblioClientRequest {
  cif?: string;
  name?: string;
  rc?: string;
  code?: string;
  address?: string;
  state?: string;
  city?: string;
  country?: string;
  iban?: string;
  bank?: string;
  email?: string;
  phone?: string;
  contact?: string;
  vatPayer?: boolean;
}

export interface OblioProductRequest {
  name: string;
  code?: string;
  description?: string;
  price: number;
  measuringUnit?: string;
  currency?: string;
  vatPercentage: number;
  quantity?: number;
  productType?: string;
  management?: string;
  managementId?: string;
  workStation?: string;
  workStationId?: string;
  discount?: number;
  discountType?: string;
  vatName?: string;
  vatIncluded?: number;
}

export interface OblioInvoiceRequest {
  cachedName?: OblioClientRequest;
  client: OblioClientRequest;
  issueDate: string;
  dueDate?: string;
  deliveryDate?: string;
  collectDate?: string;
  seriesName: string;
  language?: string;
  precision?: number;
  currency?: string;
  products: OblioProductRequest[];
  issuerName?: string;
  issuerId?: string;
  noticeNumber?: string;
  internalNote?: string;
  depName?: string;
  depId?: string;
  salesAgent?: string;
  salesAgentId?: string;
  mention?: string;
  observations?: string;
  workStation?: string;
  workStationId?: string;
  management?: string;
  managementId?: string;
  paymentLink?: string;
  paymentLinkText?: string;
  paymentLinkTextSecondary?: string;
  paymentLinkSecondary?: string;
  paymentLinkSecondaryText?: string;
  paymentLinkSecondaryTextSecondary?: string;
  sendEmail?: number;
}

export interface OblioProformaRequest {
  cachedName: OblioClientRequest;
  client: OblioClientRequest;
  issueDate: string;
  dueDate: string;
  deliveryDate: string;
  seriesName: string;
  language?: string;
  precision?: number;
  currency?: string;
  products: OblioProductRequest[];
  internalNote?: string;
  depName?: string;
  depId?: string;
  salesAgent?: string;
  salesAgentId?: string;
  mention?: string;
  observations?: string;
  workStation?: string;
  workStationId?: string;
  management?: string;
  managementId?: string;
}

export interface OblioDocumentResponse {
  status: number;
  statusMessage: string;
  data?: {
    seriesName: string;
    number: number;
    link: string;
    linkPdf: string;
    linkXml?: string;
    linkView?: string;
  };
}

export const oblioApi = {
  getCompanies: async (): Promise<OblioCompany[]> => {
    const response = await apiClient.get<OblioCompany[]>('/oblio/companies');
    return response.data;
  },

  getVatRates: async (cif: string): Promise<OblioVatRate[]> => {
    const response = await apiClient.get<OblioVatRate[]>(
      `/oblio/vat-rates?cif=${encodeURIComponent(cif)}`,
    );
    return response.data;
  },

  getClients: async (
    cif: string,
    name?: string,
    clientCif?: string,
    offset: number = 0,
  ): Promise<OblioClient[]> => {
    const params = new URLSearchParams({ cif, offset: offset.toString() });
    if (name) params.append('name', name);
    if (clientCif) params.append('clientCif', clientCif);

    const response = await apiClient.get<OblioClient[]>(
      `/oblio/clients?${params.toString()}`,
    );
    return response.data;
  },

  getProducts: async (
    cif: string,
    name?: string,
    code?: string,
    management?: string,
    workStation?: string,
    offset: number = 0,
  ): Promise<OblioProduct[]> => {
    const params = new URLSearchParams({ cif, offset: offset.toString() });
    if (name) params.append('name', name);
    if (code) params.append('code', code);
    if (management) params.append('management', management);
    if (workStation) params.append('workStation', workStation);

    const response = await apiClient.get<OblioProduct[]>(
      `/oblio/products?${params.toString()}`,
    );
    return response.data;
  },

  createInvoice: async (
    cif: string,
    invoiceRequest: OblioInvoiceRequest,
  ): Promise<OblioDocumentResponse> => {
    const response = await apiClient.post<OblioDocumentResponse>(
      `/oblio/invoice?cif=${encodeURIComponent(cif)}`,
      invoiceRequest,
    );
    return response.data;
  },

  createProforma: async (
    cif: string,
    proformaRequest: OblioProformaRequest,
  ): Promise<OblioDocumentResponse> => {
    const response = await apiClient.post<OblioDocumentResponse>(
      `/oblio/proforma?cif=${encodeURIComponent(cif)}`,
      proformaRequest,
    );
    return response.data;
  },

  getDocument: async (
    cif: string,
    seriesName: string,
    number: number,
    type: string = 'pdf',
  ): Promise<Blob> => {
    const response = await apiClient.get(
      `/oblio/document?cif=${encodeURIComponent(cif)}&seriesName=${encodeURIComponent(seriesName)}&number=${number}&type=${type}`,
      { responseType: 'blob' },
    );
    return response.data;
  },

  cancelDocument: async (
    cif: string,
    seriesName: string,
    number: number,
    type: string = 'invoice',
  ): Promise<boolean> => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/oblio/document?cif=${encodeURIComponent(cif)}&seriesName=${encodeURIComponent(seriesName)}&number=${number}&type=${type}`,
    );
    return response.data.success;
  },

  restoreDocument: async (
    cif: string,
    seriesName: string,
    number: number,
    type: string = 'invoice',
  ): Promise<boolean> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/oblio/document/restore?cif=${encodeURIComponent(cif)}&seriesName=${encodeURIComponent(seriesName)}&number=${number}&type=${type}`,
    );
    return response.data.success;
  },

  deleteDocument: async (
    cif: string,
    seriesName: string,
    number: number,
    type: string = 'invoice',
  ): Promise<boolean> => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/oblio/document/delete?cif=${encodeURIComponent(cif)}&seriesName=${encodeURIComponent(seriesName)}&number=${number}&type=${type}`,
    );
    return response.data.success;
  },
};
