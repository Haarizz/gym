import type { FollowUpFilters } from '../domain/FollowUpFilters';

export const followUpKeys = {
  all: ['followUps'] as const,
  lists: () => [...followUpKeys.all, 'list'] as const,
  list: (filters?: FollowUpFilters) => [...followUpKeys.lists(), filters] as const,
  details: () => [...followUpKeys.all, 'detail'] as const,
  detail: (id: number) => [...followUpKeys.details(), id] as const,
  stats: () => [...followUpKeys.all, 'stats'] as const,
};
