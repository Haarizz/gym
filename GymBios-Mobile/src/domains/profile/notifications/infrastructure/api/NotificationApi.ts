import { apiClient } from '@/core/network/apiClient';
import { camelizeKeys } from '@/shared/utils/caseKeys';
import type {
  NotificationItem,
  NotificationPage,
  UnreadCountResponse,
} from '../../domain/notification.types';

export class NotificationApi {
  /**
   * GET /api/notifications?page=0&size=20[&module=...]
   */
  async getNotifications(page = 0, size = 20, module?: string): Promise<NotificationPage> {
    const response = await apiClient.get('/notifications', {
      params: { page, size, module },
    });
    // Backend is snake_case (is_read, created_at, action_url, reference_id).
    const result = camelizeKeys<NotificationPage>(response.data);
    // Older backends serialize the flag as "read" (Jackson strips the "is" from isRead()).
    result.content = (result.content ?? []).map((n) => {
      const { read, ...rest } = n as NotificationItem & { read?: boolean };
      return { ...rest, isRead: Boolean(n.isRead ?? read) };
    });
    return result;
  }

  /**
   * GET /api/notifications/unread-count[?module=...]
   */
  async getUnreadCount(module?: string): Promise<UnreadCountResponse> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count', {
      params: { module },
    });
    return response.data;
  }

  /**
   * PUT /api/notifications/{id}/read
   */
  async markRead(id: number): Promise<void> {
    await apiClient.put(`/notifications/${id}/read`);
  }

  /**
   * PUT /api/notifications/read-all[?module=...]
   */
  async markAllRead(module?: string): Promise<void> {
    await apiClient.put('/notifications/read-all', undefined, { params: { module } });
  }

  /**
   * DELETE /api/notifications/{id}
   */
  async deleteNotification(id: number): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  }
}
