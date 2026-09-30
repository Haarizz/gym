import type { ApiNotificationRepository } from '../../infrastructure/repository/ApiNotificationRepository';
import type {
  NotificationPage,
  UnreadCountResponse,
} from '../../domain/notification.types';

export class NotificationService {
  constructor(private readonly repository: ApiNotificationRepository) {}

  async getNotifications(page = 0, size = 20, module?: string): Promise<NotificationPage> {
    return this.repository.getNotifications(page, size, module);
  }

  async getUnreadCount(module?: string): Promise<UnreadCountResponse> {
    return this.repository.getUnreadCount(module);
  }

  async markRead(id: number): Promise<void> {
    return this.repository.markRead(id);
  }

  async markAllRead(module?: string): Promise<void> {
    return this.repository.markAllRead(module);
  }

  async deleteNotification(id: number): Promise<void> {
    return this.repository.deleteNotification(id);
  }
}
