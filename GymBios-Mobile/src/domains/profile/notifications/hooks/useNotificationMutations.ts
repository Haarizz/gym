import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from './notificationKeys';
import { notificationService } from './useUnreadNotificationCount';

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  return {
    markRead: markReadMutation.mutateAsync,
    isMarkingRead: markReadMutation.isPending,
    markAllRead: markAllReadMutation.mutateAsync,
    isMarkingAllRead: markAllReadMutation.isPending,
    deleteNotification: deleteNotificationMutation.mutateAsync,
    isDeleting: deleteNotificationMutation.isPending,
  };
}
