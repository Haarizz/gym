import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CommunityService } from '../application/CommunityService';
import { ApiCommunityRepository } from '../infrastructure/ApiCommunityRepository';

const repository = new ApiCommunityRepository();
const communityService = new CommunityService(repository);

export const communityKeys = {
  all: ['community'] as const,
  stats: () => [...communityKeys.all, 'stats'] as const,
  trendingTopics: () => [...communityKeys.all, 'trending-topics'] as const,
  leaderboard: () => [...communityKeys.all, 'leaderboard'] as const,
  access: () => [...communityKeys.all, 'access'] as const,
  feeds: () => [...communityKeys.all, 'feed'] as const,
  feed: (params: { q?: string; type?: string; archived?: boolean }) =>
    [...communityKeys.feeds(), params] as const,
  comments: (postId: number) =>
    [...communityKeys.all, 'comments', postId] as const,
};

export function useCommunityStats() {
  return useQuery({
    queryKey: communityKeys.stats(),
    queryFn: () => communityService.getEngagementStats(),
  });
}

export function useCommunityTrendingTopics() {
  return useQuery({
    queryKey: communityKeys.trendingTopics(),
    queryFn: () => communityService.getTrendingTopics(),
  });
}

export function useCommunityLeaderboard() {
  return useQuery({
    queryKey: communityKeys.leaderboard(),
    queryFn: () => communityService.getLeaderboard(),
  });
}

function useCommunityAccess() {
  return useQuery({
    queryKey: communityKeys.access(),
    queryFn: async () => {
      const { canPost, canInteract } = await communityService.getFeed(undefined, undefined, undefined, 1, 1);
      return { canPost, canInteract };
    },
  });
}

/**
 * Whether the signed-in account may create posts in this gym's community: only
 * with an active membership here (for Cash/Credit/Mixed purchases, once reception
 * approves it).
 */
export function useCommunityCanPost(): boolean {
  return useCommunityAccess().data?.canPost === true;
}

/**
 * Whether the signed-in account may like and comment. An active membership at
 * any gym is enough; an account with none anywhere can only read.
 */
export function useCommunityCanInteract(): boolean {
  return useCommunityAccess().data?.canInteract === true;
}

export function useCommunityFeed(params: {
  q?: string;
  type?: string;
  archived?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: communityKeys.feed(params),
    queryFn: ({ pageParam = 1 }) =>
      communityService.getFeed(
        params.q,
        params.type,
        params.archived,
        pageParam as number,
        20,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

export function useCommunityComments(postId: number) {
  return useQuery({
    queryKey: communityKeys.comments(postId),
    queryFn: () => communityService.getComments(postId),
    enabled: !!postId,
  });
}
