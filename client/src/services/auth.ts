/**
 * auth.ts — Authentication API service
 * Handles register, login, token refresh, profile get/update, and logout.
 */
import { apiClient, parseApiError } from "./api";
import { tokenStorage } from "../utils/tokenStorage";
import { User, Role } from "../types";

export interface LoginPayload {
  email: string;
  password: string;
  expoPushToken?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  address?: string;
  houseDescription?: string;
  localGovt?: string;
  ward?: string;
  pollingUnit?: string;
  houseType?: string;
  numberOfRooms?: number;
  numberOfShops?: number;
  numberOfWorkersRange?: string;
  location?: { type: "Point"; coordinates: [number, number] };
  expoPushToken?: string;
  truckPlateNumber?: string;
  truckCapacity?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─── Map server user shape → client User type ─────────────────────────────────
function normaliseUser(raw: any): User {
  return {
    id: raw._id ?? raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    address: raw.address,
    houseDescription: raw.houseDescription,
    localGovt: raw.localGovt,
    ward: raw.ward,
    houseType: raw.houseType,
    numberOfRooms: raw.numberOfRooms,
    numberOfShops: raw.numberOfShops,
    numberOfWorkersRange: raw.numberOfWorkersRange,
    role: raw.role as Role,
    createdAt: raw.createdAt,
    truckPlateNumber: raw.truckPlateNumber,
    truckCapacity: raw.truckCapacity,
    isDeactivated: raw.isDeactivated,
    deactivationReason: raw.deactivationReason,
  };
}

async function persistSession(data: AuthResponse): Promise<User> {
  const user = normaliseUser(data.user);
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
  await tokenStorage.saveUser(user);
  return user;
}

export interface RegisterInitResponse {
  requiresVerification: boolean;
  email: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<RegisterInitResponse> {
    const { data } = await apiClient.post("/auth/register", payload);
    return {
      requiresVerification: true,
      email: data.data?.email || payload.email.trim().toLowerCase(),
    };
  },

  async verifyEmail(
    email: string,
    otp: string,
    expoPushToken?: string,
  ): Promise<User> {
    const { data } = await apiClient.post("/auth/verify-email", {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      expoPushToken,
    });
    return persistSession(data.data);
  },

  async resendVerificationOtp(email: string): Promise<string> {
    const { data } = await apiClient.post("/auth/resend-verification", {
      email: email.trim().toLowerCase(),
    });
    return data.message || "Verification code sent to your email.";
  },

  async forgotPassword(email: string): Promise<string> {
    const { data } = await apiClient.post("/auth/forgot-password", {
      email: email.trim().toLowerCase(),
    });
    return data.message || "Password reset code sent to your email.";
  },

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<string> {
    const { data } = await apiClient.post("/auth/reset-password", {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      newPassword,
    });
    return data.message || "Password reset successful.";
  },

  async login(payload: LoginPayload): Promise<User> {
    const { data } = await apiClient.post("/auth/login", payload);
    console.log("login response", data);
    return persistSession(data.data);
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get("/auth/me");
    const user = normaliseUser(data.data);
    await tokenStorage.saveUser(user);
    return user;
  },

  async updateMe(updates: Partial<RegisterPayload>): Promise<User> {
    const { data } = await apiClient.patch("/auth/me", updates);
    const user = normaliseUser(data.data);
    await tokenStorage.saveUser(user);
    return user;
  },

  async updatePushToken(expoPushToken: string): Promise<void> {
    await apiClient.patch("/auth/push-token", { expoPushToken });
  },

  async deactivateAccount(): Promise<void> {
    await apiClient.patch("/auth/deactivate");
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete("/auth/me");
  },

  async logout(): Promise<void> {
    await tokenStorage.clearTokens();
  },

  /** Restore session from local storage on app boot */
  async checkSession(): Promise<User | null> {
    const user = await tokenStorage.getUser<User>();
    if (!user) return null;
    // Verify token is still valid with a lightweight /me call
    try {
      return await authService.getMe();
    } catch {
      await tokenStorage.clearTokens();
      return null;
    }
  },
};
