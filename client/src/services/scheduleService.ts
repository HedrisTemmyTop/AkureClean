import { CollectionSchedule } from '../types';
import { mockSchedules } from '../data/mockData';

let currentSchedules = [...mockSchedules];

export const scheduleService = {
  async getSchedulesByLocation(locationId: string): Promise<CollectionSchedule[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return currentSchedules.filter(s => s.locationId === locationId);
  },

  async getAllSchedules(): Promise<CollectionSchedule[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return [...currentSchedules];
  },

  async createSchedule(data: Omit<CollectionSchedule, 'id'>): Promise<CollectionSchedule> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const newSchedule: CollectionSchedule = {
      ...data,
      id: `sch_${Date.now()}`
    };
    currentSchedules = [...currentSchedules, newSchedule];
    return newSchedule;
  }
};
