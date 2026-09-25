import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/domains/auth';
import { CommunityService } from '../application/CommunityService';
import { ApiCommunityRepository } from '../infrastructure/ApiCommunityRepository';
import { ApiGlobalCommunityRepository } from '../infrastructure/ApiGlobalCommunityRepository';
import type { CommunityApiMode, CommunityClientConfig } from '../domain/community.types';

const legacyService = new CommunityService(new ApiCommunityRepository());
const globalService = new CommunityService(new ApiGlobalCommunityRepository());

export const communityKeys = {
  all: ['community'] as const,
  /** Per selected gym: availability and the gym a member would post as both depend on it. */
  config: (tenant: string | null) => [...communityKeys.all, 'config', tenant] as const,
  stats: () => [...communityKeys.all, 'stats'] as const,
  trendingTopics: () => [...communityKeys.all, 'trending-topics'] as const,
  leaderboard: () => [...communityKeys.all, 'leaderboard'] as const,
  feeds: () => [...communityKeys.all, 'feed'] as const,
  feed: (mode: CommunityApiMode, params: { q?: string; type?: string; archived?: boolean }) =>
    [...communityKeys.feeds(), mode, params] as const,
  comments: (postId: number) =>
    [...communityKeys.all, 'comments', postId] as const,
};

/**
 * Whether the GymBios-wide Community is available to this user. Any failure —
 * including an older backend without the endpoint — means "not available", so
 * the app keeps using the legacy gym-scoped API.
 */
export function useCommunityConfig() {
  const activeTenant = useAuthStore((s) => s.activeTenant);
  return useQuery({
    queryKey: communityKeys.config(activeTenant),
    queryFn: async (): Promise<CommunityClientConfig | null> => {
      try {
        return await globalService.getConfig();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}

/** The API mode and matching service. Queries wait for `isResolved` so the UI never flips from legacy to global. */
export function useCommunityMode(): {
  mode: CommunityApiMode;
  service: CommunityService;
  config: CommunityClientConfig | null;
  isResolved: boolean;
} {
  const { data, isFetched } = useCommunityConfig();
  const config = data ?? null;
  const mode: CommunityApiMode = config?.available ? 'global' : 'legacy';
  return {
    mode,
    service: mode === 'global' ? globalService : legacyService,
    config,
    isResolved: isFetched,
  };
}

/** Gym analytics: always gym-scoped. */
export function useCommunityStats() {
  return useQuery({
    queryKey: communityKeys.stats(),
    queryFn: () => legacyService.getEngagementStats(),
  });
}

export function useCommunityTrendingTopics() {
  const { mode, service, isResolved } = useCommunityMode();
  return useQuery({
    queryKey: [...communityKeys.trendingTopics(), mode],
    queryFn: () => service.getTrendingTopics(),
    enabled: isResolved,
  });
}

export function useCommunityLeaderboard() {
  const { mode, service, isResolved } = useCommunityMode();
  return useQuery({
    queryKey: [...communityKeys.leaderboard(), mode],
    queryFn: () => service.getLeaderboard(),
    enabled: isResolved,
  });
}

export function useCommunityFeed(params: {
  q?: string;
  type?: string;
  archived?: boolean;
}) {
  const { mode, service, isResolved } = useCommunityMode();
  return useInfiniteQuery({
    queryKey: communityKeys.feed(mode, params),
    queryFn: ({ pageParam }) =>
      service.getFeed(params.q, params.type, params.archived, pageParam as number | string, 20),
    // Legacy pages are numbered; the global feed pages with an opaque cursor ('' = first page).
    initialPageParam: (mode === 'global' ? '' : 1) as number | string,
    getNextPageParam: (lastPage) => lastPage.nextPageParam ?? undefined,
    enabled: isResolved,
  });
}

export function useCommunityComments(postId: number) {
  const { service, isResolved } = useCommunityMode();
  return useQuery({
    queryKey: communityKeys.comments(postId),
    queryFn: () => service.getComments(postId),
    enabled: !!postId && isResolved,
  });
}
