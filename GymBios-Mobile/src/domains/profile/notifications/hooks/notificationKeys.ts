export const notificationKeys = {
  all: ['profile', 'notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (page?: number, size?: number) =>
    [...notificationKeys.lists(), { page, size }] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};
