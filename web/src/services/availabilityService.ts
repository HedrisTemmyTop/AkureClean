import { apiClient } from "./api";

export interface AvailabilityDay {
  date: string;
  dayOfMonth: number;
  dayOfWeek: string;
  shortDay: string;
  isPast: boolean;
  isToday: boolean;
}

export interface MonthWeek {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  isPastWeek: boolean;
  isCurrentWeek: boolean;
  days: AvailabilityDay[];
}

export interface AvailabilityPickupItem {
  id: string;
  residentName: string;
  residentPhone: string;
  address: string;
  pollingUnit: string;
  localGovt: string;
  type: string;
  status: string;
  extraFee: number;
}

export interface AvailabilitySlot {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  date: string;
  dayOfWeek: string;
  timeSlot: string;
  pickupsCount?: number;
  pickups?: AvailabilityPickupItem[];
}

export interface DriverCoverage {
  localGovts: string[];
  wards: string[];
  pollingUnits: string[];
  assignmentsCount: number;
}

export interface AdminDriverAvailabilityItem {
  driver: {
    id: string;
    _id: string;
    name: string;
    email: string;
    phone: string;
    truckPlateNumber: string;
    truckCapacity: string;
    address?: string;
    localGovt?: string;
    ward?: string;
    pollingUnit?: string;
    isDeactivated: boolean;
  };
  coverage: DriverCoverage;
  hasAvailability: boolean;
  availabilityId: string | null;
  approvalStatus: "pending" | "approved" | "rejected" | null;
  approvedAt: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  monthKey: string;
  slots: AvailabilitySlot[];
  availableDates: string[];
  notes: string;
  updatedAt: string | null;
  totalPickupsThisMonth: number;
}

export interface AdminAvailabilityResponse {
  monthKey: string;
  year: number;
  month: number;
  weeks: MonthWeek[];
  summary: {
    totalDrivers: number;
    driversWithAvailability: number;
    driversPendingAvailability: number;
    totalScheduledDays: number;
    awaitingApproval: number;
    approvedCount: number;
    rejectedCount?: number;
  };
  drivers: AdminDriverAvailabilityItem[];
}

export const availabilityService = {
  async getAllDriversAvailability(
    monthKey?: string
  ): Promise<AdminAvailabilityResponse> {
    const params = monthKey ? { monthKey } : undefined;
    const { data } = await apiClient.get("/availability/admin", { params });
    return data.data as AdminAvailabilityResponse;
  },

  async approveAvailability(id: string): Promise<any> {
    const { data } = await apiClient.patch(`/availability/admin/${id}/approve`);
    return data.data;
  },

  async rejectAvailability(id: string, reason: string): Promise<any> {
    const { data } = await apiClient.patch(`/availability/admin/${id}/reject`, {
      reason,
    });
    return data.data;
  },
};

export default availabilityService;
