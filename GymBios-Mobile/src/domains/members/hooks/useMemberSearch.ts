import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { Member } from '../domain/Member';
import { MemberDirectoryService } from '../application/directory/MemberDirectoryService';
import { ApiMemberDirectoryRepository } from '../infrastructure/directory/ApiMemberDirectoryRepository';

import { memberKeys } from './useMembers';

const repository = new ApiMemberDirectoryRepository();
const directoryService = new MemberDirectoryService(repository);

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const SEARCH_LIMIT = 10;

export interface UseMemberSearchReturn {
  /** Members matching the current query. Empty when idle or no results. */
  members: Member[];
  /** True while a debounced search request is in flight. */
  loading: boolean;
  /** Error from the last search request, or null. */
  error: Error | null;
  /** True when the query is too short to search (idle state). */
  idle: boolean;
  /** True when a search completed and returned zero results. */
  empty: boolean;
}

/**
 * Debounced member search hook — the single source of truth for member
 * lookup across the app.
 *
 * Responsibilities:
 *  - Debounces user input (300ms)
 *  - Calls the backend member search endpoint (GET /members?search=...)
 *  - Exposes loading / error / empty / idle states
 *  - Cancels stale requests via TanStack Query's query-key invalidation
 *
 * The Billing module consumes this hook; it never builds member suggestions
 * from receipts or dues.
 */
export function useMemberSearch(query: string): UseMemberSearchReturn {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the raw input.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: memberKeys.list({ search: debouncedQuery, limit: SEARCH_LIMIT }),
    queryFn: () =>
      directoryService.getMembers({
        search: debouncedQuery,
        limit: SEARCH_LIMIT,
      }),
    enabled: debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 30_000,
  });

  const members = useMemo(
    () => searchQuery.data?.content ?? [],
    [searchQuery.data],
  );

  const idle = debouncedQuery.length < MIN_QUERY_LENGTH;
  const loading = searchQuery.isFetching && !idle;
  const error = (searchQuery.error as Error | null) ?? null;
  const empty = !idle && !loading && !error && members.length === 0;

  return { members, loading, error, idle, empty };
}