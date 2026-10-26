import { apiClient } from './api';
import { Zone } from '../types';

export const zoneService = {
  async getZones(): Promise<Zone[]> {
    const { data } = await apiClient.get('/zones');
    return (data.data as any[]).map((raw) => ({
      id: String(raw._id ?? raw.id),
      _id: String(raw._id ?? raw.id),
      name: raw.name,
      description: raw.description,
      assignedDriverId: raw.assignedDriverId,
      assignedDriver: raw.assignedDriver || raw.assignedDriverId,
      boundary: raw.boundary,
      polygon: raw.boundary || raw.polygon,
      coordinates: raw.coordinates || raw.boundary?.coordinates?.[0] || [],
      createdAt: raw.createdAt,
    }));
  },

  async createZone(
    nameOrPayload: string | { name: string; description?: string; coordinates: [number, number][]; assignedDriverId?: string },
    boundaryParam?: { type: 'Polygon'; coordinates: number[][][] }
  ): Promise<Zone> {
    if (typeof nameOrPayload === 'string') {
      const { data } = await apiClient.post('/zones', { name: nameOrPayload, boundary: boundaryParam });
      return data.data as Zone;
    }

    const payload = {
      name: nameOrPayload.name,
      description: nameOrPayload.description,
      assignedDriverId: nameOrPayload.assignedDriverId,
      boundary: {
        type: 'Polygon',
        coordinates: [nameOrPayload.coordinates],
      },
    };
    const { data } = await apiClient.post('/zones', payload);
    return data.data as Zone;
  },

  async assignDriver(zoneId: string, driverId: string): Promise<Zone> {
    const { data } = await apiClient.put(`/zones/${zoneId}/assign`, { driverId });
    return data.data as Zone;
  },

  async generateRoute(zoneId: string): Promise<any> {
    const { data } = await apiClient.post(`/routes/generate/${zoneId}`);
    return data.data;
  },
};

export default zoneService;
