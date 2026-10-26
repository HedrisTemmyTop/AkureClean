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

export interface AvailabilitySlot {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  date: string;
  dayOfWeek: string;
  timeSlot: string;
  pickupsCount?: number;
  pickups?: Array<{
    id: string;
    residentName: string;
    residentPhone: string;
    address: string;
    pollingUnit: string;
    localGovt: string;
    type: string;
    status: string;
    extraFee: number;
  }>;
}

export interface DriverCoverage {
  localGovts: string[];
  wards: string[];
  pollingUnits: string[];
  assignmentsCount: number;
}

export interface DriverMyAvailabilityResponse {
  monthKey: string;
  year: number;
  month: number;
  weeks: MonthWeek[];
  coverage: DriverCoverage;
  availability: {
    driverId: string;
    year: number;
    month: number;
    monthKey: string;
    slots: AvailabilitySlot[];
    availableDates: string[];
    notes: string;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string | null;
    rejectedAt?: string | null;
    approvedAt?: string | null;
  };
  isLocked: boolean;
  pickupCountsByDate: Record<string, number>;
}

export interface ResidentAvailableSlot {
  date: string;
  dayOfWeek: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  timeSlot: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  monthKey: string;
  bookedResidentsCount: number;
}

export interface ResidentAvailabilityResponse {
  assignedDrivers: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    truckPlateNumber?: string;
  }>;
  availableSlots: ResidentAvailableSlot[];
  availableDates: string[];
  residentArea: {
    localGovt: string;
    ward: string;
    pollingUnit: string;
  };
  message: string | null;
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
  async getMyAvailability(
    monthKey?: string
  ): Promise<DriverMyAvailabilityResponse> {
    const params = monthKey ? { monthKey } : undefined;
    const { data } = await apiClient.get("/availability/me", { params });
    return data.data;
  },

  async saveMyAvailability(payload: {
    monthKey?: string;
    dates: string[];
    timeSlot?: string;
    notes?: string;
  }): Promise<any> {
    const { data } = await apiClient.post("/availability", payload);
    return data.data;
  },

  async getResidentAvailableDates(): Promise<ResidentAvailabilityResponse> {
    const { data } = await apiClient.get("/availability/resident");
    return data.data;
  },

  async getAllDriversAvailability(
    monthKey?: string
  ): Promise<AdminAvailabilityResponse> {
    const params = monthKey ? { monthKey } : undefined;
    const { data } = await apiClient.get("/availability/admin", { params });
    return data.data;
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
