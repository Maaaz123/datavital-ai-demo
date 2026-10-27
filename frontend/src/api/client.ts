import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { logApiFailure } from '@/utils/logApiFailure';
import { staticDemoAdapter } from '@/demo/staticDemo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
});

// GitHub Pages has no API server. This public build answers with synthetic data.
apiClient.defaults.adapter = staticDemoAdapter;

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log endpoint failures for operators; UI never receives technical payloads from this.
    if (!(originalRequest?.url?.includes('/auth/refresh') && error.response?.status === 401)) {
      logApiFailure(error);
    }

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    const { refreshToken, setTokens, logout } = useAuthStore.getState();

    if (!refreshToken) {
      logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{
        success: boolean;
        data: { access_token: string; refresh_token: string; token_type: string; expires_in: number };
      }>(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });

      const tokens = data.data;
      setTokens(tokens.access_token, tokens.refresh_token);
      processQueue(tokens.access_token);
      originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(null);
      logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

import type { GlobalFilterState } from '@/types/api';

export function buildFilterParams(filters: GlobalFilterState): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value as string | number;
    }
  });
  return params;
}
