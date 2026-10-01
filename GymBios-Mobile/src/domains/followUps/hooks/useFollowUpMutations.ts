import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { dashboardKeys } from '@/domains/dashboard/hooks/useStaffDashboard';
import { leadKeys } from '@/domains/leads/hooks/leadKeys';
import { performanceKeys } from '@/domains/performance/hooks/useStaffPerformance';
import { scheduleKeys } from '@/domains/schedule/hooks/useStaffSchedule';

import type {
  AddCommunicationRecordRequest,
  CompleteFollowUpRequest,
  FollowUpRequest,
  RescheduleFollowUpRequest,
} from '../domain/FollowUpRequest';
import { followUpKeys } from './followUpKeys';
import { followUpService } from './useFollowUps';

/**
 * Follow-up state also feeds the staff dashboard (urgent follow-ups, today's
 * stats), the staff schedule and performance (follow-up completion %), so
 * refresh those alongside the follow-up lists.
 */
function invalidateFollowUpViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: followUpKeys.lists() });
  queryClient.invalidateQueries({ queryKey: followUpKeys.stats() });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.staff() });
  queryClient.invalidateQueries({ queryKey: scheduleKeys.staff() });
  queryClient.invalidateQueries({ queryKey: performanceKeys.staff() });
}

export function useCreateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: FollowUpRequest) => followUpService.create(request),
    onSuccess: () => {
      invalidateFollowUpViews(queryClient);
    },
  });
}

export function useUpdateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: FollowUpRequest }) =>
      followUpService.update(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: followUpKeys.detail(variables.id),
      });
      invalidateFollowUpViews(queryClient);
    },
  });
}

export function useDeleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => followUpService.delete(id),
    onSuccess: (_data, id) => {
      invalidateFollowUpViews(queryClient);
      queryClient.removeQueries({ queryKey: followUpKeys.detail(id) });
    },
  });
}

export function useCompleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: number;
      request: CompleteFollowUpRequest;
    }) => followUpService.complete(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: followUpKeys.detail(variables.id),
      });
      invalidateFollowUpViews(queryClient);
      // A "converted" outcome also flips the lead's status on the backend.
      if (variables.request.outcome === 'converted') {
        queryClient.invalidateQueries({ queryKey: leadKeys.all });
      }
    },
  });
}

export function useCancelFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => followUpService.cancel(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: followUpKeys.detail(id) });
      invalidateFollowUpViews(queryClient);
    },
  });
}

export function useRescheduleFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      request,
    }: {
      id: number;
      request: RescheduleFollowUpRequest;
    }) => followUpService.reschedule(id, request),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: followUpKeys.detail(variables.id),
      });
      invalidateFollowUpViews(queryClient);
    },
  });
}

export function useAddCommunicationRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      record,
    }: {
      id: number;
      record: AddCommunicationRecordRequest;
    }) => followUpService.addRecord(id, record),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: followUpKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteCommunicationRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      followUpId,
      recordId,
    }: {
      followUpId: number;
      recordId: number;
    }) => followUpService.deleteRecord(recordId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: followUpKeys.detail(variables.followUpId),
      });
    },
  });
}
