import {apiClient} from './apiClient';

export interface OtpRequest {
  phone: string;
  purpose: 'LOGIN_SMS' | 'SIGN_SMS' | 'EMAIL_VERIFY' | 'STEP_UP_SECURITY';
  channel?: 'sms' | 'email';
  userId?: number;
}

export interface OtpRequestResponse {
  otpId: string;
  expiresInSeconds: number;
  otpCode?: string; // Only in development
}

export interface OtpVerify {
  otpId: string;
  code: string;
  phone: string;
  purpose: 'LOGIN_SMS' | 'SIGN_SMS' | 'EMAIL_VERIFY' | 'STEP_UP_SECURITY';
}

export interface OtpVerifyResponse {
  status: string;
  message?: string;
  accessToken?: string;
  expiresInSeconds?: number;
  user?: {
    id: number;
    email: string;
    name: string;
    phone?: string;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  userId?: number;
}

export const otpApi = {
  async requestOtp(data: OtpRequest): Promise<OtpRequestResponse> {
    const response = await apiClient.post<OtpRequestResponse>('/otp/request', data);
    return response.data;
  },

  async verifyOtp(data: OtpVerify): Promise<OtpVerifyResponse> {
    const response = await apiClient.post<OtpVerifyResponse>('/otp/verify', data);
    return response.data;
  },
};
