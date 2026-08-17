export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type?: string;
  priority?: string;
  module?: string;
  referenceId?: number;
  actionUrl?: string;
  count?: number;
  isRead: boolean;
  createdAt: string; // ISO date string or formatted date
}

export interface NotificationPage {
  content: NotificationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export type NotificationFilter = 'ALL' | 'UNREAD';

export interface NotificationGroup {
  title: string;
  count: number;
  data: NotificationItem[];
}
