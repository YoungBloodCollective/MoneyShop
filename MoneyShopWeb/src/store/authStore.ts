import { create } from 'zustand';
import type { User } from '@/types/user.types';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { authApi } from '@/services/api/authApi';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: User) => void;
  register: (email: string, password: string, firstName: string, lastName: string, phone?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const response = await authApi.login({ email, password });
      tokenStorage.setToken(response.token);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loginWithToken: (token: string, user: User) => {
    tokenStorage.setToken(token);
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  register: async (email: string, password: string, firstName: string, lastName: string, phone?: string) => {
    try {
      set({ isLoading: true });
      const response = await authApi.register({
        email,
        password,
        confirmPassword: password,
        firstName,
        lastName,
        phone,
        acceptTerms: true,
        acceptGdpr: true,
        acceptCosts: true,
        mandateAnaf: true,
        ipAddress: '',
        userAgent: navigator.userAgent,
        deviceHash: '',
      });
      tokenStorage.setToken(response.token);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    tokenStorage.removeToken();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    window.location.href = '/';
  },

  checkAuth: async () => {
    try {
      const token = tokenStorage.getToken();
      if (token) {
        const user = await authApi.getCurrentUser();
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch {
      tokenStorage.removeToken();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  setUser: (user: User) => {
    set({ user });
  },

  setToken: (token: string) => {
    tokenStorage.setToken(token);
    set({ token });
  },
}));
