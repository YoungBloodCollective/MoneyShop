import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import { tokenStorage } from '@/services/storage/tokenStorage';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = tokenStorage.getToken();

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      },
    );

    this.client.interceptors.response.use(
      response => {
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
          throw new Error('Received HTML response instead of JSON. User may not be authenticated.');
        }
        // Unwrap ApiResponse envelope from backend BaseController
        if (response.data && typeof response.data === 'object' && 'statusCode' in response.data && 'data' in response.data) {
          response.data = response.data.data;
        }
        return response;
      },
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          tokenStorage.removeToken();
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      },
    );
  }

  get instance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().instance;
