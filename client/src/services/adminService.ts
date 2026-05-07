/**
 * adminService.ts — Admin API service
 * Dashboard stats and driver management.
 */
import { apiClient } from './api';
import { AdminStats, User } from '../types';

export const adminService = {
  async getDashboardStats(): Promise<AdminStats> {
    const { data } = await apiClient.get('/admin/stats');
    return data.data as AdminStats;
  },

  async getAreaNodes(): Promise<any[]> {
    // Not yet a real endpoint — return empty until implemented
    return [];
  },

  async getAllDrivers(search?: string): Promise<User[]> {
    const params = search ? { search } : undefined;
    const { data } = await apiClient.get('/admin/drivers', { params });
    return (data.data as any[]).map((raw) => ({
      id: String(raw._id ?? raw.id),
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      role: raw.role,
      createdAt: raw.createdAt,
      truckPlateNumber: raw.truckPlateNumber,
      truckCapacity: raw.truckCapacity,
      isDeactivated: raw.isDeactivated,
      deactivationReason: raw.deactivationReason,
    }));
  },

  async getAllUsers(): Promise<User[]> {
    const { data } = await apiClient.get('/admin/users');
    return (data.data as any[]).map((raw) => ({
      id: raw._id ?? raw.id,
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      role: raw.role,
      createdAt: raw.createdAt,
    }));
  },

  async getAllLogs(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/logs');
    return data.data;
  },

  async getAllResidents(search?: string): Promise<User[]> {
    const params = search ? { search } : undefined;
    const { data } = await apiClient.get('/admin/residents', { params });
    return data.data;
  },

  async updateDriverStatus(id: string, isDeactivated: boolean, deactivationReason?: string): Promise<void> {
    await apiClient.patch(`/admin/drivers/${id}/status`, {
      isDeactivated,
      deactivationReason
    });
  },

  async getAllPayments(): Promise<any[]> {
    const { data } = await apiClient.get('/admin/payments');
    return data.data;
  }
};
