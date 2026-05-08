import { apiClient } from './api';

export const driverService = {
  async getMyRoute(assignmentId?: string): Promise<any> {
    try {
      const params = assignmentId ? { assignmentId } : undefined;
      const { data } = await apiClient.get('/driver/route', { params });
      return data.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  async collectHousehold(assignmentId: string, stopId: string) {
    const { data } = await apiClient.put(`/driver/collect/${assignmentId}/${stopId}`);
    return data.data;
  },
  async skipHousehold(assignmentId: string, stopId: string, reason: string) {
    const { data } = await apiClient.put(`/driver/skip/${assignmentId}/${stopId}`, { reason });
    return data.data;
  },
  async updateRouteStatus(assignmentId: string, status: 'InProgress' | 'Paused' | 'Completed') {
    const { data } = await apiClient.patch(`/assignments/${assignmentId}/status`, { status });
    return data.data;
  },
};

// driverService is already exported above
