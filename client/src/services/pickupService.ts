import { apiClient } from "./api";

export interface PickupRequestData {
  id: string;
  userId: any; // User object populated
  driverId?: any; // User object populated
  householdId: any;
  status: string;
  extraFee: number;
  type?: string;
  address?: string;
  notes?: string;
  ward?: string;
  pollingUnit?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt?: string;
  driverRejectReason?: string;
}

export const pickupService = {
  async getAllPickups(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<PickupRequestData[]> {
    const { data } = await apiClient.get("/pickup/all", { params: filters });
    return (data.data as any[]).map((raw) => ({
      ...raw,
      id: raw._id ?? raw.id,
    }));
  },

  async getAvailablePickups(): Promise<PickupRequestData[]> {
    try {
      console.log("req");
      const { data } = await apiClient.get("/pickup");
      return (data.data as any[]).map((raw) => ({
        ...raw,
        id: raw._id ?? raw.id,
      }));
    } catch (error: any) {
      console.error(
        "Error fetching available pickups:",
        error.response?.data || error.message || error.response,
      );
      return [];
    }
  },

  async getDriverPickups(): Promise<{
    data: PickupRequestData[];
    hasActive: boolean;
    count: number;
  }> {
    const { data } = await apiClient.get("/pickup/driver");
    return {
      data: (data.data as any[]).map((raw) => ({
        ...raw,
        id: raw._id ?? raw.id,
      })),
      hasActive: data.hasActive,
      count: data.count ?? (data.data as any[]).length,
    };
  },

  async getMyPickups(): Promise<PickupRequestData[]> {
    const { data } = await apiClient.get("/pickup/mine");
    return (data.data as any[]).map((raw) => ({
      ...raw,
      id: raw._id ?? raw.id,
    }));
  },

  // payPickupFee removed as payment is physical

  async getPickupById(id: string): Promise<any> {
    const { data } = await apiClient.get(`/pickup/${id}`);
    const raw = data.data;
    return {
      ...raw,
      id: raw._id ?? raw.id,
    };
  },

  async respondToPickup(id: string, action: "accept"): Promise<void> {
    await apiClient.put(`/pickup/${id}/respond`, { action });
  },

  async markCollected(id: string): Promise<void> {
    await apiClient.post(`/pickup/${id}/collect`);
  },

  async rejectPickup(id: string, reason: string): Promise<void> {
    await apiClient.post(`/pickup/${id}/reject`, { reason });
  },

  async cancelPickupByResident(id: string): Promise<void> {
    await apiClient.post(`/pickup/${id}/cancel`);
  },

  async createPickupRequest(
    type: string,
    notes: string,
    options?: {
      scheduledDate?: string;
      scheduledTime?: string;
      amount?: number;
      image?: string | null;
    },
  ): Promise<any> {
    const { data } = await apiClient.post("/pickup", {
      type,
      notes,
      ...options,
    });
    return data.data;
  },

  async getCollectorPickups(id: string): Promise<PickupRequestData[]> {
    const { data } = await apiClient.get(`/pickup/collector/${id}`);
    return (data.data as any[]).map((raw) => ({
      ...raw,
      id: raw._id ?? raw.id,
    }));
  },
};
