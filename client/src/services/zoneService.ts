import { apiClient } from './api';

export const zoneService = {
  async createZone(name: string, locationBoundaries: any[]): Promise<any> {
    const { data } = await apiClient.post('/zones', { name, locationBoundaries });
    return data.data;
  },

  async getZones(): Promise<any[]> {
    const { data } = await apiClient.get('/zones');
    return data.data;
  },

  async assignDriver(zoneId: string, driverId: string): Promise<any> {
    const { data } = await apiClient.put(`/zones/${zoneId}/assign`, { driverId });
    return data.data;
  }
};
