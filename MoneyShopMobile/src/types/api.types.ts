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
  firstName: string;
  lastName: string;
  phone?: string;
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
}

