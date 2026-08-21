import { apiClient } from '@/core/network/apiClient';
import type {
  NotificationPage,
  UnreadCountResponse,
} from '../../domain/notification.types';

export class NotificationApi {
  /**
   * GET /api/notifications?page=0&size=20
   */
  async getNotifications(page = 0, size = 20): Promise<NotificationPage> {
    const response = await apiClient.get<NotificationPage>('/notifications', {
      params: { page, size },
    });
    return response.data;
  }

  /**
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.data;
  }

  /**
   * PUT /api/notifications/{id}/read
   */
  async markRead(id: number): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`);
  }

  /**
   * PUT /api/notifications/read-all
   */
  async markAllRead(): Promise<void> {
    await apiClient.put('/notifications/read-all');
  }

  /**
   * DELETE /api/notifications/{id}
   */
  async deleteNotification(id: number): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  }
}
