/**
 * apiClient.ts
 * Centralised Axios instance for AkureClean.
 *
 * - Attaches JWT access token to every protected request via request interceptor
 * - Silently refreshes expired access tokens using the refresh token (token rotation)
 * - Surfaces clean, typed error messages for display in the UI
 */
import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "../utils/tokenStorage";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Change this to your machine's LAN IP when testing on a physical device,
// e.g. 'http://192.168.1.100:5000/api'
export const BASE_URL = "http://localhost:5001/api";
// export const BASE_URL = "https://computational-small-public-causing.trycloudflare.com/api";

// ─── INSTANCE ────────────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // 15-second timeout
  headers: { "Content-Type": "application/json" },
});

// ─── REQUEST INTERCEPTOR — attach access token ────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
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

// ─── RESPONSE INTERCEPTOR — silent token refresh ─────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    const is401 = error.response?.status === 401;
    const isRefreshEndpoint = originalRequest?.url?.includes("/auth/refresh");

    if (
      is401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              (
                originalRequest.headers as Record<string, string>
              ).Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefresh } = data.data;

        await tokenStorage.setTokens(accessToken, newRefresh);
        processQueue(null, accessToken);

        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization =
            `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await tokenStorage.clearTokens();
        // Caller (AuthContext) will detect missing session and redirect to login
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── HELPER — parse backend error message ────────────────────────────────────
/**
 * Extracts a human-readable error message from an Axios error.
 * Falls back to the network/timeout message when the server is unreachable.
 */
export function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Server responded with a structured error body
    const responseData = error.response?.data as
      | { message?: string; data?: { msg?: string }[] }
      | undefined;
    if (responseData?.message) return responseData.message;

    // Validation error array from express-validator
    if (Array.isArray(responseData?.data) && responseData.data[0]?.msg) {
      return responseData.data[0].msg;
    }

    // Network / timeout
    if (error.code === "ECONNABORTED")
      return "Request timed out. Please check your connection.";
    if (!error.response)
      return "Cannot reach the server. Please check your internet connection.";
  }

  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
