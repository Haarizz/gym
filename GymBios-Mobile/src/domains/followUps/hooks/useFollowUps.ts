import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { FollowUpFilters } from '../domain/FollowUpFilters';
import type { FollowUpPageResponse } from '../domain/FollowUpPageResponse';
import { FollowUpService } from '../application/FollowUpService';
import { ApiFollowUpRepository } from '../infrastructure/ApiFollowUpRepository';
import { followUpKeys } from './followUpKeys';

const repository = new ApiFollowUpRepository();
export const followUpService = new FollowUpService(repository);

export function useFollowUps(filters?: FollowUpFilters) {
  return useQuery({
    queryKey: followUpKeys.list(filters),
    queryFn: () => followUpService.getFollowUps(filters),
  });
}

export function useFollowUp(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: followUpKeys.detail(id),
    queryFn: () => followUpService.getById(id),
    enabled: Boolean(id),
    placeholderData: () => {
      const listQueries = queryClient.getQueriesData<FollowUpPageResponse>({
        queryKey: followUpKeys.lists(),
      });
      for (const [, data] of listQueries) {
        const match = data?.followUps?.find((followUp) => followUp.id === id);
        if (match) return match;
      }
      return undefined;
    },
  });
}

export function useFollowUpStats() {
  return useQuery({
    queryKey: followUpKeys.stats(),
    queryFn: () => followUpService.getStats(),
  });
}
