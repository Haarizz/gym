import type { NotificationApi } from '../api/NotificationApi';
import type {
  NotificationPage,
  UnreadCountResponse,
} from '../../domain/notification.types';

export class ApiNotificationRepository {
  constructor(private readonly api: NotificationApi) {}

  async getNotifications(page: number, size: number, module?: string): Promise<NotificationPage> {
    return this.api.getNotifications(page, size, module);
  }

  async getUnreadCount(module?: string): Promise<UnreadCountResponse> {
    return this.api.getUnreadCount(module);
  }

  async markRead(id: number): Promise<void> {
    return this.api.markRead(id);
  }

  async markAllRead(module?: string): Promise<void> {
    return this.api.markAllRead(module);
  }

  async deleteNotification(id: number): Promise<void> {
    return this.api.deleteNotification(id);
  }
}
