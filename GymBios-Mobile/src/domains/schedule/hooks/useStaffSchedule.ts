import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StaffScheduleData } from '../domain/StaffScheduleData';
import { staffScheduleRepository } from '../infrastructure/ApiStaffScheduleRepository';

export const scheduleKeys = {
  all: ['schedule'] as const,
  staff: () => [...scheduleKeys.all, 'staff'] as const,
};

export function useStaffSchedule() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: scheduleKeys.staff(),
    queryFn: async (): Promise<StaffScheduleData> => {
      return staffScheduleRepository.getStaffSchedule();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: string | number) => {
      await staffScheduleRepository.completeTask(taskId);
      return taskId;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.staff() });
      const previousData = queryClient.getQueryData<StaffScheduleData>(scheduleKeys.staff());

      // Optimistically update the UI to mark the task as completed
      if (previousData) {
        queryClient.setQueryData<StaffScheduleData>(scheduleKeys.staff(), {
          ...previousData,
          tasks: previousData.tasks.map(t =>
            t.id === taskId ? { ...t, completed: true } : t
          ),
        });
      }

      return { previousData };
    },
    onSuccess: () => {
      // Invalidate the query to fetch the latest summary and tasks data after completion
      queryClient.invalidateQueries({ queryKey: scheduleKeys.staff() });
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(scheduleKeys.staff(), context.previousData);
      }
    },
  });

  return {
    ...query,
    data: query.data,
    toggleTask: (taskId: string | number) => toggleTaskMutation.mutate(taskId),
  };
}
