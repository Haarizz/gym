import { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type {
  NotificationFilter,
  NotificationGroup,
  NotificationItem,
} from '../domain/notification.types';
import { notificationKeys } from './notificationKeys';
import { notificationService } from './useUnreadNotificationCount';

function isToday(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function useNotifications() {
  const [filter, setFilter] = useState<NotificationFilter>('ALL');

  const query = useInfiniteQuery({
    queryKey: notificationKeys.lists(),
    queryFn: ({ pageParam = 0 }) =>
      notificationService.getNotifications(pageParam as number, 20),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last || lastPage.empty) {
        return undefined;
      }
      return lastPage.number + 1;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  const allNotifications = useMemo(() => {
    if (!query.data?.pages) return [];
    const seen = new Set<number>();
    const items: NotificationItem[] = [];

    for (const page of query.data.pages) {
      if (page.content) {
        for (const item of page.content) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            items.push(item);
          }
        }
      }
    }
    return items;
  }, [query.data]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'UNREAD') {
      return allNotifications.filter((n) => !n.isRead);
    }
    return allNotifications;
  }, [allNotifications, filter]);

  const groupedNotifications = useMemo(() => {
    const todayItems: NotificationItem[] = [];
    const earlierItems: NotificationItem[] = [];

    for (const item of filteredNotifications) {
      if (isToday(item.createdAt)) {
        todayItems.push(item);
      } else {
        earlierItems.push(item);
      }
    }

    const groups: NotificationGroup[] = [];

    if (todayItems.length > 0) {
      groups.push({
        title: 'TODAY',
        count: todayItems.length,
        data: todayItems,
      });
    }

    if (earlierItems.length > 0) {
      groups.push({
        title: 'EARLIER',
        count: earlierItems.length,
        data: earlierItems,
      });
    }

    return groups;
  }, [filteredNotifications]);

  const totalElements = query.data?.pages[0]?.totalElements ?? allNotifications.length;

  return {
    notifications: filteredNotifications,
    groupedNotifications,
    totalElements,
    filter,
    setFilter,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}
