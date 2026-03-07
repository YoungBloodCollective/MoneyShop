import { apiClient } from './apiClient';

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  context?: Record<string, unknown>;
}

export interface ChatResponse {
  raspuns: string;
  model_folosit: string;
  upgraded: boolean;
  incredere?: number;
  siguranta?: {
    blocked?: boolean;
    motiv?: string;
    bank_name_scrubbed?: boolean;
    cached?: boolean;
    faq_id?: string;
    score?: number;
  };
  meta?: string;
  nota: string;
}

export interface InitialMessageResponse {
  mesaj: string;
  disclaimer: string;
}

export const chatApi = {
  getInitialMessage: async (): Promise<InitialMessageResponse> => {
    const response = await apiClient.get<InitialMessageResponse>('/chat/initial');
    return response.data;
  },

  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>('/chat', request);
    return response.data;
  },
};
