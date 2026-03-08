import { mockCollectorStats, mockUsers } from '../data/mockData';
import { CollectorStats, User } from '../types';

export const collectorService = {
  async getAllCollectors(): Promise<(User & Partial<CollectorStats>)[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const collectors = mockUsers.filter(u => u.role === 'Collector');
    
    return collectors.map(c => {
      const stats = mockCollectorStats.find(s => s.collectorId === c.id);
      return { ...c, ...stats };
    });
  },

  async getCollectorPerformance(collectorId: string): Promise<CollectorStats | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockCollectorStats.find(s => s.collectorId === collectorId);
  }
};
