/**
 * notificationService.ts — Notification API service
 * Maps to /api/notifications endpoints.
 */
import { apiClient } from './api';
import { Notification, NotificationType } from '../types';

function normaliseNotification(raw: any): Notification {
  return {
    id: raw._id ?? raw.id,
    userId: raw.userId?._id ?? raw.userId ?? '',
    title: raw.title,
    message: raw.message,
    date: raw.createdAt ?? raw.date,
    type: (raw.type ?? 'System') as NotificationType,
    read: raw.read ?? false,
  };
}

export const notificationService = {
  async getNotifications(_userId?: string): Promise<Notification[]> {
    const { data } = await apiClient.get('/notifications');
    return (data.data as any[]).map(normaliseNotification);
  },

  async getUnreadCount(_userId?: string): Promise<number> {
    const { data } = await apiClient.get('/notifications/unread-count');
    return data.data.count as number;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/mark-all-read');
  },
};
