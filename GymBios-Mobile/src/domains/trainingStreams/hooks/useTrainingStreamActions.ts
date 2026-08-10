import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiTrainingStreamRepository } from '../infrastructure/ApiTrainingStreamRepository';
import type { CreateTrainingStreamRequest, UpdateTrainingStreamRequest } from '../application/TrainingStreamRepository';
import { trainingStreamKeys } from './useTrainingStreams';

const repository = new ApiTrainingStreamRepository();

export function useCreateTrainingStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTrainingStreamRequest) => repository.createStream(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.analytics() });
    },
  });
}

export function useUpdateTrainingStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: UpdateTrainingStreamRequest }) =>
      repository.updateStream(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.analytics() });
    },
  });
}

export function useDeleteTrainingStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => repository.deleteStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.analytics() });
    },
  });
}

export function useStartTrainingStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => repository.startStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.analytics() });
    },
  });
}

export function useEndTrainingStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => repository.endStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.analytics() });
    },
  });
}

export function useJoinTrainingStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => repository.joinStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.analytics() });
    },
  });
}

export function useLeaveTrainingStream() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => repository.leaveStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.lists() });
      queryClient.invalidateQueries({ queryKey: trainingStreamKeys.analytics() });
    },
  });
}
