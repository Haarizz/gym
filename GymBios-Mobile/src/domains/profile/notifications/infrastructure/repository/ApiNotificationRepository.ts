import type { NotificationApi } from '../api/NotificationApi';
import type {
  NotificationPage,
  UnreadCountResponse,
} from '../../domain/notification.types';

export class ApiNotificationRepository {
  constructor(private readonly api: NotificationApi) {}

  async getNotifications(page: number, size: number): Promise<NotificationPage> {
    return this.api.getNotifications(page, size);
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    return this.api.getUnreadCount();
  }

  async markRead(id: number): Promise<void> {
    return this.api.markRead(id);
  }

  async markAllRead(): Promise<void> {
    return this.api.markAllRead();
  }

  async deleteNotification(id: number): Promise<void> {
    return this.api.deleteNotification(id);
  }
}
