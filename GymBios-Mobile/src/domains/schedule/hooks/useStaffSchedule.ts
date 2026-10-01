import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StaffScheduleData } from '../domain/StaffScheduleData';
import { staffScheduleRepository, type NextFollowUpRequest } from '../infrastructure/ApiStaffScheduleRepository';
import { useBranchContext } from "@/shared/providers/BranchProvider";
import { dashboardKeys } from '@/domains/dashboard/hooks/useStaffDashboard';
import { followUpKeys } from '@/domains/followUps/hooks/followUpKeys';
import { leadKeys } from '@/domains/leads/hooks/leadKeys';
import { performanceKeys } from '@/domains/performance/hooks/useStaffPerformance';

export const scheduleKeys = {
  all: ['schedule'] as const,
  staff: () => [...scheduleKeys.all, 'staff'] as const,
};

interface CompleteTaskInput {
  taskId: string | number;
  outcome?: string;
  notes?: string;
}

/**
 * @param date Optional `yyyy-MM-dd`. Omit for today's schedule.
 */
export function useStaffSchedule(date?: string) {
    const { selectedBranchId } = useBranchContext();
  const queryClient = useQueryClient();
  const queryKey = [...scheduleKeys.staff(), selectedBranchId, date ?? 'today'];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<StaffScheduleData> => {
      return staffScheduleRepository.getStaffSchedule(date);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Completing a follow-up (and booking the next one) touches the lead, follow-up lists,
  // dashboard and performance — refresh them all, not just the schedule.
  const invalidateAfterFollowUpChange = () => {
    queryClient.invalidateQueries({ queryKey: scheduleKeys.staff() });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.staff() });
    queryClient.invalidateQueries({ queryKey: followUpKeys.all });
    queryClient.invalidateQueries({ queryKey: leadKeys.all });
    queryClient.invalidateQueries({ queryKey: performanceKeys.all });
  };

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, outcome, notes }: CompleteTaskInput) => {
      await staffScheduleRepository.completeTask(taskId, outcome, notes);
      return taskId;
    },
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.staff() });
      const previousData = queryClient.getQueryData<StaffScheduleData>(queryKey);

      // Optimistically update the UI to mark the task as completed
      if (previousData) {
        queryClient.setQueryData<StaffScheduleData>(queryKey, {
          ...previousData,
          tasks: previousData.tasks.map(t =>
            t.id === taskId ? { ...t, completed: true } : t
          ),
        });
      }

      return { previousData };
    },
    onSuccess: invalidateAfterFollowUpChange,
    onError: (_err, _input, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
  });

  const scheduleNextMutation = useMutation({
    mutationFn: ({ taskId, request }: { taskId: string | number; request: NextFollowUpRequest }) =>
      staffScheduleRepository.scheduleNextFollowUp(taskId, request),
    onSuccess: invalidateAfterFollowUpChange,
  });

  return {
    ...query,
    data: query.data,
    completeTask: toggleTaskMutation.mutateAsync,
    isCompleting: toggleTaskMutation.isPending,
    scheduleNextFollowUp: scheduleNextMutation.mutateAsync,
    isSchedulingNext: scheduleNextMutation.isPending,
  };
}
