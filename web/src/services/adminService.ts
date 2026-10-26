import { apiClient } from './api';
import {
  AdminStats,
  User,
  ActivityLog,
  Bill,
  DriverTelemetry,
  ResidentBillingSummary,
  ResidentBillingLedger,
} from '../types';

export const adminService = {
  async getDashboardStats(params?: { startDate?: string; endDate?: string }): Promise<AdminStats> {
    const { data } = await apiClient.get('/admin/stats', { params });
    return data.data as AdminStats;
  },

  async getStats(params?: { startDate?: string; endDate?: string }): Promise<AdminStats> {
    return adminService.getDashboardStats(params);
  },

  async getAllDrivers(search?: string): Promise<User[]> {
    const params = search ? { search } : undefined;
    const { data } = await apiClient.get('/admin/drivers', { params });
    return (data.data as any[]).map((raw) => ({
      id: String(raw._id ?? raw.id),
      _id: String(raw._id ?? raw.id),
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      role: raw.role,
      createdAt: raw.createdAt,
      truckPlateNumber: raw.truckPlateNumber,
      vehiclePlate: raw.vehiclePlate || raw.truckPlateNumber || 'AKR-TRUCK',
      truckCapacity: raw.truckCapacity,
      status: raw.status || (raw.isDeactivated ? 'inactive' : 'active'),
      isActive: !raw.isDeactivated,
      isDeactivated: raw.isDeactivated,
      deactivationReason: raw.deactivationReason,
      localGovt: raw.localGovt,
      ward: raw.ward,
      location: raw.location,
    }));
  },

  async getDrivers(search?: string): Promise<User[]> {
    return adminService.getAllDrivers(search);
  },

  async updateDriverStatus(
    id: string,
    isActiveOrDeactivated: boolean,
    reason?: string
  ): Promise<User> {
    // If called with (id, isActive, reason), isDeactivated = !isActive
    const isDeactivated = typeof isActiveOrDeactivated === 'boolean'
      ? !isActiveOrDeactivated
      : false;

    const { data } = await apiClient.patch(`/admin/drivers/${id}/status`, {
      isDeactivated,
      deactivationReason: reason || '',
    });
    return data.data as User;
  },

  async getAllResidents(search?: string): Promise<User[]> {
    const params = search ? { search } : undefined;
    const { data } = await apiClient.get('/admin/residents', { params });
    return (data.data as any[]).map((raw) => ({
      id: String(raw._id ?? raw.id),
      _id: String(raw._id ?? raw.id),
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      address: raw.address,
      localGovt: raw.localGovt,
      ward: raw.ward,
      pollingUnit: raw.pollingUnit,
      housingType: raw.housingType || raw.houseType || 'Standard',
      houseType: raw.houseType,
      houseDescription: raw.houseDescription,
      numberOfRooms: raw.numberOfRooms,
      numberOfShops: raw.numberOfShops,
      numberOfWorkersRange: raw.numberOfWorkersRange,
      role: raw.role,
      location: raw.location,
      createdAt: raw.createdAt,
    }));
  },

  async getResidents(search?: string): Promise<User[]> {
    return adminService.getAllResidents(search);
  },

  async getAllUsers(): Promise<User[]> {
    const { data } = await apiClient.get('/admin/users');
    return (data.data as any[]).map((raw) => ({
      id: String(raw._id ?? raw.id),
      _id: String(raw._id ?? raw.id),
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      role: raw.role,
      localGovt: raw.localGovt,
      ward: raw.ward,
      createdAt: raw.createdAt,
    }));
  },

  async getUsers(): Promise<User[]> {
    return adminService.getAllUsers();
  },

  async getAllLogs(): Promise<ActivityLog[]> {
    const { data } = await apiClient.get('/admin/logs');
    return (data.data as any[]).map((raw) => ({
      id: String(raw._id ?? raw.id),
      _id: String(raw._id ?? raw.id),
      action: raw.action || 'System Event',
      description: raw.description || '',
      timestamp: raw.timestamp || raw.createdAt || new Date().toISOString(),
      createdAt: raw.createdAt || raw.timestamp || new Date().toISOString(),
      ipAddress: raw.ipAddress || '127.0.0.1',
      details: raw.details || {},
      user: raw.user || raw.userId,
      userId: raw.userId || raw.user,
    }));
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    return adminService.getAllLogs();
  },

  async getAllPayments(): Promise<Bill[]> {
    const { data } = await apiClient.get('/admin/payments');
    return (data.data as any[]).map((raw) => ({
      id: String(raw._id ?? raw.id),
      _id: String(raw._id ?? raw.id),
      userId: raw.userId || { name: 'Unknown', email: 'N/A' },
      amount: raw.amount,
      year: raw.year,
      month: raw.month,
      status: raw.status,
      billingPeriod: raw.billingPeriod || `${raw.month || ''} ${raw.year || ''}`.trim() || 'Monthly',
      paymentReference: raw.paymentReference || raw.paystackReference,
      paystackReference: raw.paystackReference,
      paidAt: raw.paidAt,
      paymentDate: raw.paidAt || raw.paymentDate,
      dueDate: raw.dueDate,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      billDetails: raw.billDetails,
    }));
  },

  async getPayments(): Promise<Bill[]> {
    return adminService.getAllPayments();
  },

  async getLiveDrivers(): Promise<DriverTelemetry[]> {
    const { data } = await apiClient.get('/admin/tracking/drivers');
    return data.data as DriverTelemetry[];
  },

  async getResidentsBillingSummary(params?: {
    search?: string;
    filter?: 'all' | 'in_arrears' | 'up_to_date';
  }): Promise<{ data: ResidentBillingSummary[]; meta: any }> {
    const { data } = await apiClient.get('/admin/billing/residents', { params });
    return data as { data: ResidentBillingSummary[]; meta: any };
  },

  async getResidentBillingHistory(id: string): Promise<ResidentBillingLedger> {
    const { data } = await apiClient.get(`/admin/billing/residents/${id}/history`);
    return data.data as ResidentBillingLedger;
  },
};

export default adminService;
