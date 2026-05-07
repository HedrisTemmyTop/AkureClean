/**
 * scheduleService.ts — Collection Schedule API service
 * Maps to /api/schedules endpoints.
 */
import { apiClient } from './api';
import { CollectionSchedule } from '../types';

function normaliseSchedule(raw: any): CollectionSchedule {
  return {
    id: raw._id ?? raw.id,
    locationId: raw.zoneId?._id ?? raw.zoneId ?? raw.ward ?? '',
    dayOfWeek: raw.dayOfWeek,
    nextPickup: raw.nextPickup,
  };
}

export const scheduleService = {
  /** Resident: fetch schedules matching their ward/LGA from their profile */
  async getSchedulesByLocation(_locationId?: string): Promise<CollectionSchedule[]> {
    const { data } = await apiClient.get('/schedules/mine');
    return (data.data as any[]).map(normaliseSchedule);
  },

  async getAllSchedules(): Promise<CollectionSchedule[]> {
    const { data } = await apiClient.get('/schedules');
    return (data.data as any[]).map(normaliseSchedule);
  },

  async createSchedule(payload: {
    zoneId: string;
    lga?: string;
    ward?: string;
    dayOfWeek: CollectionSchedule['dayOfWeek'];
    nextPickup: string;
  }): Promise<CollectionSchedule> {
    const { data } = await apiClient.post('/schedules', payload);
    return normaliseSchedule(data.data);
  },
};
