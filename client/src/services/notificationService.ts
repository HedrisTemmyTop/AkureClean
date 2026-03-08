import { Notification } from '../types';
import { mockNotifications } from '../data/mockData';

let currentNotifications = [...mockNotifications];

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return currentNotifications.filter(n => n.userId === userId).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  },

  async markAsRead(notificationId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    currentNotifications = currentNotifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
  },

  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.getNotifications(userId);
    return notifications.filter(n => !n.read).length;
  }
};
