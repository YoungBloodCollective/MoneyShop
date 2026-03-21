import { apiClient } from './apiClient';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '@/types/api.types';

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {},

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  async sendEmailVerification(email?: string): Promise<{ success: boolean; message: string; otpId: string; expiresInSeconds: number }> {
    const response = await apiClient.post('/auth/send-email-verification', { email });
    return response.data;
  },

  async sendPhoneVerification(phone?: string): Promise<{ success: boolean; message: string; otpId: string; expiresInSeconds: number }> {
    const response = await apiClient.post('/auth/send-phone-verification', { phone });
    return response.data;
  },

  async verifyEmail(otpId: string, code: string, email?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/verify-email', { otpId, code, email });
    return response.data;
  },

  async verifyPhone(otpId: string, code: string, phone?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/auth/verify-phone', { otpId, code, phone });
    return response.data;
  },
};
