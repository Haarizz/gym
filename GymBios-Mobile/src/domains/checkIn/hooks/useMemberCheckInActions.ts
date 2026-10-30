import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { memberCheckInApi } from '../infrastructure/MemberCheckInApi';
import type { MemberBreakResponse, MemberCheckInStatus, MemberFeedbackPayload } from '../domain/MemberFeedback';
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
    onSuccess: (resp) => {
      // Start the visit timer straight away instead of waiting for the refetch.
      queryClient.setQueryData<MemberCheckInStatus>(checkInKeys.memberStatus(), (prev) => ({
        ...prev,
        checkedIn: true,
        attendanceId: resp.attendanceId ?? null,
        checkInTime: resp.checkInTime ?? new Date().toISOString(),
        breakStartTime: null,
        breakMinutes: 0,
        unclosedAttendanceId: null,
        unclosedCheckInTime: null,
        unclosedAutoCloseTime: null,
      }));
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

/** Take Break / Resume — writes the result into the cached status so the card reacts at once. */
function useBreakMutation(run: () => Promise<MemberBreakResponse>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: run,
    onSuccess: (resp) => {
      queryClient.setQueryData<MemberCheckInStatus>(checkInKeys.memberStatus(), (prev) =>
        prev
          ? {
              ...prev,
              breakStartTime: resp.breakStartTime ?? null,
              breakMinutes: resp.breakMinutes ?? 0,
            }
          : prev,
      );
      queryClient.invalidateQueries({ queryKey: checkInKeys.all });
    },
  });
}

export function useTakeBreak() {
  return useBreakMutation(() => memberCheckInApi.startBreak());
}

export function useResumeFromBreak() {
  return useBreakMutation(() => memberCheckInApi.resumeFromBreak());
}
