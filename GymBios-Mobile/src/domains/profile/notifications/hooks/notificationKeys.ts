export const notificationKeys = {
  all: ['profile', 'notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (module?: string) => [...notificationKeys.lists(), { module: module ?? null }] as const,
  unreadCount: (module?: string) =>
    [...notificationKeys.all, 'unread-count', { module: module ?? null }] as const,
};
