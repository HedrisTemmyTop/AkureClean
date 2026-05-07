import { apiClient } from "./api";

export interface PickupRequestData {
  id: string;
  userId: string;
  householdId: any;
  status: string;
  extraFee: number;
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
    const { data } = await apiClient.get("/pickup");
    return (data.data as any[]).map((raw) => ({
      ...raw,
      id: raw._id ?? raw.id,
    }));
  },

  async getDriverPickups(): Promise<{
    data: PickupRequestData[];
    hasActive: boolean;
  }> {
    const { data } = await apiClient.get("/pickup/driver");
    return {
      data: (data.data as any[]).map((raw) => ({
        ...raw,
        id: raw._id ?? raw.id,
      })),
      hasActive: data.hasActive,
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

  async completePickupByResident(id: string): Promise<void> {
    await apiClient.post(`/pickup/${id}/complete`);
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
