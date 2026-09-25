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
  CommunityApiMode,
  CommunityClientConfig,
  CommunityPostCapabilities,
  CommunityCommentCapabilities,
  CommunityReportReason,
} from './domain/community.types';

export type { CommunityRepository } from './application/CommunityRepository';
export { CommunityService } from './application/CommunityService';

export { ApiCommunityRepository } from './infrastructure/ApiCommunityRepository';
export { ApiGlobalCommunityRepository } from './infrastructure/ApiGlobalCommunityRepository';

export {
  communityKeys,
  useCommunityStats,
  useCommunityTrendingTopics,
  useCommunityLeaderboard,
  useCommunityFeed,
  useCommunityComments,
  useCommunityConfig,
  useCommunityMode,
} from './hooks/useCommunity';

export {
  useCreateCommunityPost,
  useAddCommunityComment,
  useToggleCommunityLike,
  useDeleteCommunityPost,
  useDeleteCommunityComment,
  useArchiveCommunityPost,
  useUnarchiveCommunityPost,
  useReportCommunityPost,
  useReportCommunityComment,
  useModerateCommunityPost,
  useModerateCommunityComment,
} from './hooks/useCommunityActions';

// Presentation screens (consumed by Expo Router route files)
export { CommunityScreen } from './presentation/screens/CommunityScreen';
export { CreateCommunityPostScreen } from './presentation/screens/CreateCommunityPostScreen';
