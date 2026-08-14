import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  AddCommunicationRecordRequest,
  CompleteFollowUpRequest,
  FollowUpRequest,
  RescheduleFollowUpRequest,
} from '../domain/FollowUpRequest';
import { followUpKeys } from './followUpKeys';
import { followUpService } from './useFollowUps';

export function useCreateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: FollowUpRequest) => followUpService.create(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followUpKeys.lists() });
      queryClient.invalidateQueries({ queryKey: followUpKeys.stats() });
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
      queryClient.invalidateQueries({ queryKey: followUpKeys.lists() });
      queryClient.invalidateQueries({ queryKey: followUpKeys.stats() });
    },
  });
}

export function useDeleteFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => followUpService.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: followUpKeys.lists() });
      queryClient.invalidateQueries({ queryKey: followUpKeys.stats() });
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
      queryClient.invalidateQueries({ queryKey: followUpKeys.lists() });
      queryClient.invalidateQueries({ queryKey: followUpKeys.stats() });
    },
  });
}

export function useCancelFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => followUpService.cancel(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: followUpKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: followUpKeys.lists() });
      queryClient.invalidateQueries({ queryKey: followUpKeys.stats() });
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
      queryClient.invalidateQueries({ queryKey: followUpKeys.lists() });
      queryClient.invalidateQueries({ queryKey: followUpKeys.stats() });
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
