import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "DANGER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  module: string;
  referenceId: number | null;
  actionUrl: string | null;
  count: number;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  content: AppNotification[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-based)
  size: number;
}

function mapNotification(r: any): AppNotification {
  return {
    id: r.id,
    title: r.title ?? "",
    message: r.message ?? "",
    type: r.type ?? "INFO",
    priority: r.priority ?? "LOW",
    module: r.module ?? "GENERAL",
    referenceId: r.reference_id ?? r.referenceId ?? null,
    actionUrl: r.action_url ?? r.actionUrl ?? null,
    count: r.count ?? 1,
    isRead: r.is_read ?? r.isRead ?? false,
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  };
}

export const notificationService = {
  async getNotifications(page = 0, size = 20): Promise<NotificationPage> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/notifications?page=${page}&size=${size}`
    );
    if (!res.ok) throw new Error("Failed to fetch notifications");
    const data = await res.json();
    return {
      content: (data.content ?? []).map(mapNotification),
      totalElements: data.total_elements ?? data.totalElements ?? 0,
      totalPages: data.total_pages ?? data.totalPages ?? 1,
      number: data.number ?? 0,
      size: data.size ?? size,
    };
  },

  async getUnreadCount(): Promise<number> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/notifications/unread-count`
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
  },

  async markAsRead(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/notifications/${id}/read`,
      { method: "PUT" }
    );
    if (!res.ok) throw new Error("Failed to mark notification as read");
  },

  async markAllRead(): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/notifications/read-all`,
      { method: "PUT" }
    );
    if (!res.ok) throw new Error("Failed to mark all notifications as read");
  },

  async deleteNotification(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/notifications/${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete notification");
  },
};
