import { apiClient } from './api';
import { User } from '../types';

export interface AdminLoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    try {
      // First try the strict backend admin login route
      const { data } = await apiClient.post('/auth/admin/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const user = data.data.user as User;
      localStorage.setItem('smartenv_admin_access_token', data.data.accessToken);
      localStorage.setItem('smartenv_admin_refresh_token', data.data.refreshToken);
      localStorage.setItem('smartenv_admin_user', JSON.stringify(user));
      return user;
    } catch (error: any) {
      // If endpoint returned 404 (e.g. server hasn't restarted with new route yet), fall back to standard /auth/login with strict role check
      if (error.response?.status === 404) {
        const { data } = await apiClient.post('/auth/login', {
          email: email.trim().toLowerCase(),
          password,
        });

        const user = data.data.user as User;
        if (!user.role || user.role.toLowerCase() !== 'admin') {
          throw new Error('Access denied. Only administrator accounts are authorized to sign in.');
        }

        localStorage.setItem('smartenv_admin_access_token', data.data.accessToken);
        localStorage.setItem('smartenv_admin_refresh_token', data.data.refreshToken);
        localStorage.setItem('smartenv_admin_user', JSON.stringify(user));
        return user;
      }
      throw error;
    }
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get('/auth/me');
    const user = (data.data?.user || data.data) as User;
    if (user.role.toLowerCase() !== 'admin') {
      throw new Error('Access denied. Administrator privileges required.');
    }
    localStorage.setItem('smartenv_admin_user', JSON.stringify(user));
    return user;
  },

  async updateMe(updates: Partial<User>): Promise<User> {
    const { data } = await apiClient.patch('/auth/me', updates);
    const user = (data.data?.user || data.data) as User;
    localStorage.setItem('smartenv_admin_user', JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem('smartenv_admin_access_token');
    localStorage.removeItem('smartenv_admin_refresh_token');
    localStorage.removeItem('smartenv_admin_user');
  },

  getSavedUser(): User | null {
    const raw = localStorage.getItem('smartenv_admin_user');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      if (user.role?.toLowerCase() !== 'admin') return null;
      return user;
    } catch {
      return null;
    }
  },

  hasToken(): boolean {
    return !!(
      localStorage.getItem('smartenv_admin_access_token') ||
      localStorage.getItem('smartenv_admin_refresh_token')
    );
  },

  async forgotPassword(email: string): Promise<string> {
    const { data } = await apiClient.post('/auth/forgot-password', {
      email: email.trim().toLowerCase(),
    });
    return data.message || 'Password reset code sent to your email.';
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<string> {
    const { data } = await apiClient.post('/auth/reset-password', {
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      newPassword,
    });
    return data.message || 'Password reset successful.';
  },
};
