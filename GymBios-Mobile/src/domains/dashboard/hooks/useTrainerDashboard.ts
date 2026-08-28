import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/domains/profile';
import type { TrainerDashboardData } from '../domain/TrainerDashboardData';
import { trainerDashboardRepository } from '../infrastructure/ApiTrainerDashboardRepository';

const DEFAULT_TRAINER_DASHBOARD: TrainerDashboardData = {
  trainerInfo: {
    name: 'Rahul Mehta',
    specialization: 'Strength & Conditioning',
    rating: 4.9,
  },
  todaysStats: {
    sessionsScheduled: 0,
    sessionsCompleted: 0,
    activeMembers: 0,
    todayEarnings: '₹0',
    monthlyTargetPercentage: 0,
  },
  todaySessions: [],
  pendingTasks: [], // Deferred
};

export const trainerDashboardKeys = {
  all: ['dashboard', 'trainer'] as const,
};

export function useTrainerDashboard() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: trainerDashboardKeys.all,
    queryFn: async (): Promise<TrainerDashboardData> => {
      try {
        const data = await trainerDashboardRepository.getTrainerDashboard();
        return {
          ...data,
          trainerInfo: {
            ...data.trainerInfo,
            name: data.trainerInfo?.name || profile?.name || DEFAULT_TRAINER_DASHBOARD.trainerInfo.name,
          },
          pendingTasks: [], // Deferred as per backend instruction
        };
      } catch {
        return {
          ...DEFAULT_TRAINER_DASHBOARD,
          trainerInfo: {
            ...DEFAULT_TRAINER_DASHBOARD.trainerInfo,
            name: profile?.name || DEFAULT_TRAINER_DASHBOARD.trainerInfo.name,
          },
        };
      }
    },
    staleTime: 1000 * 60 * 2,
  });

  const togglePendingTaskMutation = useMutation({
    mutationFn: async (taskId: string | number) => taskId,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: trainerDashboardKeys.all });
      const prev = queryClient.getQueryData<TrainerDashboardData>(trainerDashboardKeys.all);
      if (prev) {
        queryClient.setQueryData<TrainerDashboardData>(trainerDashboardKeys.all, {
          ...prev,
          pendingTasks: prev.pendingTasks.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _taskId, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(trainerDashboardKeys.all, ctx.prev);
      }
    },
  });

  const startSessionMutation = useMutation({
    mutationFn: (sessionId: string | number) => trainerDashboardRepository.startSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainerDashboardKeys.all });
    },
  });

  const finishSessionMutation = useMutation({
    mutationFn: (sessionId: string | number) => trainerDashboardRepository.finishSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainerDashboardKeys.all });
    },
  });

  return {
    ...query,
    data: query.data ?? DEFAULT_TRAINER_DASHBOARD,
    togglePendingTask: (id: string | number) => togglePendingTaskMutation.mutate(id),
    startSession: (id: string | number) => startSessionMutation.mutate(id),
    finishSession: (id: string | number) => finishSessionMutation.mutate(id),
  };
}
