import { useQuery } from '@tanstack/react-query';
import { NotificationApi } from '../infrastructure/api/NotificationApi';
import { ApiNotificationRepository } from '../infrastructure/repository/ApiNotificationRepository';
import { NotificationService } from '../application/services/NotificationService';
import { notificationKeys } from './notificationKeys';

const api = new NotificationApi();
const repository = new ApiNotificationRepository(api);
export const notificationService = new NotificationService(repository);

export function useUnreadNotificationCount() {
  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const count = query.data?.count ?? 0;

  return {
    count,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
