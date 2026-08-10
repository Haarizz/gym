export type {
  CommunityPostImage,
  CommunityPost,
  CommunityComment,
  TypeBreakdown,
  WeeklyPoint,
  CommunityStats,
  TrendingTopic,
  LeaderboardEntry,
  PaginationInfo,
  CommunityPostsPageResponse,
  CreateCommunityPostRequest,
  CreateCommunityCommentRequest,
  ToggleCommunityLikeResponse,
} from './domain/community.types';

export type { CommunityRepository } from './application/CommunityRepository';
export { CommunityService } from './application/CommunityService';

export { ApiCommunityRepository } from './infrastructure/ApiCommunityRepository';

export {
  communityKeys,
  useCommunityStats,
  useCommunityTrendingTopics,
  useCommunityLeaderboard,
  useCommunityFeed,
  useCommunityComments,
} from './hooks/useCommunity';

export {
  useCreateCommunityPost,
  useAddCommunityComment,
  useToggleCommunityLike,
  useDeleteCommunityPost,
  useDeleteCommunityComment,
  useArchiveCommunityPost,
  useUnarchiveCommunityPost,
} from './hooks/useCommunityActions';
