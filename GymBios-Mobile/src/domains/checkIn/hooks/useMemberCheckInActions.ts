import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { memberCheckInApi } from '../infrastructure/MemberCheckInApi';
import type { MemberFeedbackPayload } from '../domain/MemberFeedback';
import { checkInKeys } from './checkInKeys';
import { dashboardKeys } from '@/domains/dashboard/hooks/useStaffDashboard';

export function useMemberCheckInStatus() {
  return useQuery({
    queryKey: checkInKeys.memberStatus(),
    queryFn: () => memberCheckInApi.getStatus(),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useMemberCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => memberCheckInApi.checkIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useMemberCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => memberCheckInApi.checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useSubmitWorkoutFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MemberFeedbackPayload) => memberCheckInApi.submitFeedback(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
