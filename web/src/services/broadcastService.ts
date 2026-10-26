import { apiClient } from './api';
import { Broadcast } from '../types';

export interface CreateBroadcastPayload {
  title: string;
  message: string;
  priority?: 'normal' | 'urgent' | 'info';
  targetAudience?: 'all_residents' | 'all_users' | 'ward' | 'pollingUnit' | 'drivers';
  targetFilter?: {
    localGovt?: string;
    ward?: string;
    pollingUnit?: string;
  };
}

export const broadcastService = {
  async getBroadcasts(): Promise<Broadcast[]> {
    const { data } = await apiClient.get('/broadcasts');
    return (data.data || []).map((b: any) => ({
      id: b._id ?? b.id,
      _id: b._id,
      senderId: b.senderId,
      senderName: b.senderName || 'AkureClean Admin',
      title: b.title,
      message: b.message,
      priority: b.priority || 'normal',
      targetAudience: b.targetAudience || 'all_residents',
      targetFilter: b.targetFilter,
      recipientsCount: b.recipientsCount || 0,
      createdAt: b.createdAt,
    }));
  },

  async createBroadcast(payload: CreateBroadcastPayload): Promise<Broadcast> {
    const { data } = await apiClient.post('/broadcasts', payload);
    const b = data.data;
    return {
      id: b._id ?? b.id,
      _id: b._id,
      senderId: b.senderId,
      senderName: b.senderName || 'AkureClean Admin',
      title: b.title,
      message: b.message,
      priority: b.priority || 'normal',
      targetAudience: b.targetAudience || 'all_residents',
      targetFilter: b.targetFilter,
      recipientsCount: b.recipientsCount || 0,
      createdAt: b.createdAt,
    };
  },

  async deleteBroadcast(id: string): Promise<void> {
    await apiClient.delete(`/broadcasts/${id}`);
  },
};
