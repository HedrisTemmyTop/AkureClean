import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://akureclean.onrender.com/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartenv_admin_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
    console.log(`[FRONTEND] 🚀 Outgoing Request: ${config.method?.toUpperCase()} ${fullUrl}`, config);
    return config;
  },
  (error) => {
    console.error('[FRONTEND] ❌ Request Setup Error:', error);
    return Promise.reject(error);
  }
);

// Track whether we are currently refreshing to queue concurrent requests
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

const clearSessionAndRedirect = () => {
  localStorage.removeItem('smartenv_admin_access_token');
  localStorage.removeItem('smartenv_admin_refresh_token');
  localStorage.removeItem('smartenv_admin_user');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login?expired=true';
  }
};

apiClient.interceptors.response.use(
  (response) => {
    const fullUrl = `${response.config.baseURL || ''}${response.config.url || ''}`;
    console.log(`[FRONTEND] ✅ Response Received for ${fullUrl}:`, response.data);
    return response;
  },
  async (error: AxiosError) => {
    const fullUrl = error.config ? `${error.config.baseURL || ''}${error.config.url || ''}` : 'Unknown URL';
    console.warn(`[FRONTEND] ⚠️ Request Error for ${fullUrl} [Status ${error.response?.status}]:`, error.response?.data || error.message);

    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const is401 = error.response?.status === 401;
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');
    const isLoginEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/admin/login');

    if (is401 && originalRequest && !originalRequest._retry && !isRefreshEndpoint && !isLoginEndpoint) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('smartenv_admin_refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        localStorage.setItem('smartenv_admin_access_token', accessToken);
        localStorage.setItem('smartenv_admin_refresh_token', newRefreshToken);
        processQueue(null, accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (is401 && !isLoginEndpoint) {
      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  }
);

export function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (error.response?.data?.errors?.length) {
      return error.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please try again.';
}
