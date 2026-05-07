import { apiClient } from './api';

export const driverService = {
  async getMyRoute(): Promise<any> {
    try {
      const { data } = await apiClient.get('/driver/route');
      return data.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  async collectHousehold(householdId: string): Promise<any> {
    const { data } = await apiClient.put(`/driver/collect/${householdId}`);
    return data.data;
  }
};

// driverService is already exported above
