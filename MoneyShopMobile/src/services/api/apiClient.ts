import axios, {AxiosInstance, AxiosError, InternalAxiosRequestConfig} from 'axios';
import {API_BASE_URL} from '../../utils/constants';
import {tokenStorage} from '../storage/tokenStorage';

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
    // Request interceptor - add token to headers
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await tokenStorage.getToken();
        console.log('[apiClient] Request:', {
          url: config.url,
          method: config.method,
          hasToken: !!token,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'none',
        });
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn('[apiClient] No token available for request:', config.url);
        }
        
        // Don't set Content-Type for FormData - let axios handle it automatically
        // This is important for file uploads in React Native
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      response => {
        // Check if response is HTML (indicates redirect to login page)
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
          console.error('[apiClient] Received HTML instead of JSON:', {
            url: response.config.url,
            status: response.status,
            contentType,
            dataPreview: typeof response.data === 'string' 
              ? response.data.substring(0, 200) 
              : response.data,
          });
          throw new Error('Received HTML response instead of JSON. User may not be authenticated.');
        }
        // Unwrap ApiResponse envelope from backend BaseController
        if (response.data && typeof response.data === 'object' && 'statusCode' in response.data && 'data' in response.data) {
          response.data = response.data.data;
        }
        return response;
      },
      async (error: AxiosError) => {
        const errorData = error.response?.data;
        console.error('[apiClient] Response error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          statusText: error.response?.statusText,
          contentType: error.response?.headers['content-type'],
          dataPreview: errorData 
            ? (typeof errorData === 'string' 
                ? errorData.substring(0, 500) 
                : JSON.stringify(errorData, null, 2))
            : 'no data',
          errorMessage: typeof errorData === 'object' && errorData !== null ? (errorData as any).message : undefined,
          errorDetails: typeof errorData === 'object' && errorData !== null ? (errorData as any).details : undefined,
        });
        
        if (error.response?.status === 401) {
          // Token expired or invalid - clear storage and redirect to login
          console.warn('[apiClient] 401 Unauthorized - clearing token');
          await tokenStorage.removeToken();
          // You can dispatch a logout action here if using Redux/Zustand
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

