import { apiClient } from './api';
import { CollectionSchedule } from '../types';

export const scheduleService = {
  async getAllSchedules(): Promise<CollectionSchedule[]> {
    const { data } = await apiClient.get('/schedules');
    const rawList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    return rawList.map((raw: any) => ({
      id: String(raw._id ?? raw.id),
      _id: String(raw._id ?? raw.id),
      title: raw.title || `Schedule - ${raw.dayOfWeek || 'Weekly'}`,
      frequency: raw.frequency || 'weekly',
      timeSlot: raw.timeSlot || '08:00 AM - 12:00 PM',
      area: raw.area || raw.lga || 'Akure South',
      driver: raw.driver || raw.driverId,
      driverId: raw.driverId?._id || raw.driverId,
      zoneId: raw.zoneId,
      lga: raw.lga,
      ward: raw.ward,
      dayOfWeek: raw.dayOfWeek,
      nextPickup: raw.nextPickup || new Date().toISOString(),
      createdAt: raw.createdAt,
    }));
  },

  async getSchedules(): Promise<CollectionSchedule[]> {
    return scheduleService.getAllSchedules();
  },

  async createSchedule(payload: {
    title?: string;
    frequency?: string;
    timeSlot?: string;
    area?: string;
    driverId?: string;
    active?: boolean;
    zoneId?: string;
    lga?: string;
    ward?: string;
    dayOfWeek?: any;
    nextPickup?: string;
  }): Promise<CollectionSchedule> {
    const { data } = await apiClient.post('/schedules', payload);
    return data.data as CollectionSchedule;
  },

  async updateSchedule(
    id: string,
    payload: Partial<CollectionSchedule>
  ): Promise<CollectionSchedule> {
    const { data } = await apiClient.patch(`/schedules/${id}`, payload);
    return data.data as CollectionSchedule;
  },
};

export default scheduleService;
