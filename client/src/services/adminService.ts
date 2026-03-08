import { mockAdminStats, mockAreaNodes } from '../data/mockData';
import { AdminStats, AreaNode } from '../types';

export const adminService = {
  async getDashboardStats(): Promise<AdminStats> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAdminStats;
  },

  async getAreaNodes(): Promise<AreaNode[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockAreaNodes;
  }
};
