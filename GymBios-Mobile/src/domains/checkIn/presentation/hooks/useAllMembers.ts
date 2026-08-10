import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { MemberDirectoryService } from '../../../members/application/directory/MemberDirectoryService';
import { ApiMemberDirectoryRepository } from '../../../members/infrastructure/directory/ApiMemberDirectoryRepository';
import { memberKeys } from '../../../members/hooks/useMembers';

const repository = new ApiMemberDirectoryRepository();
const directoryService = new MemberDirectoryService(repository);

const ALL_MEMBERS_LIMIT = 500;

/**
 * Fetches the full member/staff list for the Check-In module.
 * Unlike useMemberSearch, this has no debounce — it loads on mount
 * and returns all available people that can be manually checked in.
 */
export function useAllMembers() {
  const query = useQuery({
    queryKey: memberKeys.list({ search: '', limit: ALL_MEMBERS_LIMIT }),
    queryFn: () =>
      directoryService.getMembers({ limit: ALL_MEMBERS_LIMIT }),
    staleTime: 60_000,
  });

  const members = query.data?.content ?? [];
  const isLoading = query.isLoading;
  const isRefetching = query.isRefetching;
  const error = (query.error as Error | null) ?? null;

  const refetch = useCallback(() => query.refetch(), [query]);

  return { members, isLoading, isRefetching, error, refetch };
}
