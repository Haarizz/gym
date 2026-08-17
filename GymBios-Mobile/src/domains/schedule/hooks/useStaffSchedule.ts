import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StaffScheduleData, ScheduleTask } from '../domain/StaffScheduleData';

const DEFAULT_STAFF_SCHEDULE: StaffScheduleData = {
  dateText: 'Wednesday, March 25, 2026',
  stats: {
    today: 4,
    thisWeek: 18,
    pending: 5,
  },
  tasks: [
    {
      id: 1,
      time: '09:00 AM',
      type: 'Follow-up',
      name: 'Amit Kumar',
      action: 'Call for membership inquiry',
      priority: 'high',
      phone: '+1 (555) 123-4567',
      completed: false,
    },
    {
      id: 2,
      time: '10:30 AM',
      type: 'Meeting',
      name: 'Branch Manager',
      action: 'Weekly performance review',
      priority: 'medium',
      completed: false,
    },
    {
      id: 3,
      time: '02:00 PM',
      type: 'Follow-up',
      name: 'Sneha Reddy',
      action: 'PT package discussion',
      priority: 'high',
      phone: '+1 (555) 234-5678',
      completed: false,
    },
    {
      id: 4,
      time: '04:00 PM',
      type: 'Tour',
      name: 'New Walk-in',
      action: 'Facility tour & consultation',
      priority: 'medium',
      completed: false,
    },
  ],
  upcomingFollowUps: [
    { id: 1, name: 'Rajesh Singh', date: '2026-03-26', time: '11:00 AM', type: 'Basic Membership' },
    { id: 2, name: 'Deepa Menon', date: '2026-03-27', time: '03:00 PM', type: 'Annual Plan' },
    { id: 3, name: 'Karan Desai', date: '2026-03-28', time: '10:00 AM', type: 'PT Package' },
  ],
  productivityTip:
    'Complete your high-priority follow-ups before noon to maximize conversion chances!',
};

export const scheduleKeys = {
  all: ['schedule'] as const,
  staff: () => [...scheduleKeys.all, 'staff'] as const,
};

export function useStaffSchedule() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: scheduleKeys.staff(),
    queryFn: async (): Promise<StaffScheduleData> => {
      return DEFAULT_STAFF_SCHEDULE;
    },
    staleTime: 1000 * 60 * 2,
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: string | number) => {
      return taskId;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: scheduleKeys.staff() });
      const previousData = queryClient.getQueryData<StaffScheduleData>(scheduleKeys.staff());

      if (previousData) {
        queryClient.setQueryData<StaffScheduleData>(scheduleKeys.staff(), {
          ...previousData,
          tasks: previousData.tasks.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          ),
        });
      }

      return { previousData };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(scheduleKeys.staff(), context.previousData);
      }
    },
  });

  return {
    ...query,
    data: query.data ?? DEFAULT_STAFF_SCHEDULE,
    toggleTask: (taskId: string | number) => toggleTaskMutation.mutate(taskId),
  };
}
