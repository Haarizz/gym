import { useQuery } from '@tanstack/react-query';
import { ApiTrainingStreamRepository } from '../infrastructure/ApiTrainingStreamRepository';
import type { TrainingStreamFilters } from '../domain/TrainingStream';

const repository = new ApiTrainingStreamRepository();

export const trainingStreamKeys = {
  all: ['trainingStreams'] as const,
  lists: () => [...trainingStreamKeys.all, 'list'] as const,
  list: (filters?: TrainingStreamFilters) => [...trainingStreamKeys.lists(), filters] as const,
  analytics: () => [...trainingStreamKeys.all, 'analytics'] as const,
};

export function useTrainingStreams(filters?: TrainingStreamFilters) {
  return useQuery({
    queryKey: trainingStreamKeys.list(filters),
    queryFn: () => repository.getStreams(filters),
  });
}

export function useTrainingStreamAnalytics() {
  return useQuery({
    queryKey: trainingStreamKeys.analytics(),
    queryFn: () => repository.getAnalytics(),
  });
}
