import { create } from 'zustand';
import { tokenStorage } from '@/services/storage/tokenStorage';
import { brokerAuthApi } from '@/services/api/brokerCrmApi';
import type { BrokerUser } from '@/types/broker.types';

interface BrokerAuthState {
  brokerUser: BrokerUser | null;
  isBrokerAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    nume: string;
    prenume?: string;
    email: string;
    password: string;
    telefon: string;
    firma?: string;
    cui?: string;
    judet?: string;
    oras?: string;
  }) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setBrokerUser: (user: BrokerUser) => void;
}

export const useBrokerAuthStore = create<BrokerAuthState>((set) => ({
  brokerUser: null,
  isBrokerAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { token, user } = await brokerAuthApi.login(email, password);
      tokenStorage.setToken(token);
      set({ brokerUser: user, isBrokerAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const { token, user } = await brokerAuthApi.register(data);
      tokenStorage.setToken(token);
      set({ brokerUser: user, isBrokerAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  logout: () => {
    tokenStorage.removeToken();
    set({ brokerUser: null, isBrokerAuthenticated: false });
    window.location.href = '/broker/login';
  },

  checkAuth: async () => {
    const token = tokenStorage.getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const user = await brokerAuthApi.me();
      if (user.role === 'Broker') {
        set({ brokerUser: user, isBrokerAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setBrokerUser: (user) => set({ brokerUser: user }),
}));
