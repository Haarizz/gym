import type { ApiNotificationRepository } from '../../infrastructure/repository/ApiNotificationRepository';
import type {
  NotificationPage,
  UnreadCountResponse,
} from '../../domain/notification.types';

export class NotificationService {
  constructor(private readonly repository: ApiNotificationRepository) {}

  async getNotifications(page = 0, size = 20): Promise<NotificationPage> {
    return this.repository.getNotifications(page, size);
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    return this.repository.getUnreadCount();
  }

  async markRead(id: number): Promise<void> {
    return this.repository.markRead(id);
  }

  async markAllRead(): Promise<void> {
    return this.repository.markAllRead();
  }

  async deleteNotification(id: number): Promise<void> {
    return this.repository.deleteNotification(id);
  }
}
