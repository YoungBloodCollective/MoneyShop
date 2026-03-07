export interface ApiResponse<T> {
  status: string;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: number;
  acceptTerms: boolean;
  acceptGdpr: boolean;
  acceptCosts: boolean;
  mandateAnaf: boolean;
  mandateBiroCredit?: boolean;
  shareToBroker?: boolean;
  ipAddress: string;
  userAgent: string;
  deviceHash: string;
  consentTimestamp?: string;
}

export interface AuthResponse {
  status: string;
  user_id: number;
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    phone?: string;
    kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  };
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  phone?: string;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
}
