import type {
  CommunityPost,
  CommunityComment,
  CommunityStats,
  TrendingTopic,
  LeaderboardEntry,
  CommunityPostsPageResponse,
  CreateCommunityPostRequest,
  CreateCommunityCommentRequest,
  ToggleCommunityLikeResponse,
  CommunityClientConfig,
  CommunityReportReason,
} from '../domain/community.types';

export interface CommunityRepository {
  getEngagementStats(): Promise<CommunityStats>;
  getTrendingTopics(): Promise<TrendingTopic[]>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;

  getFeed(
    q?: string,
    type?: string,
    archived?: boolean,
    pageParam?: number | string,
    limit?: number,
  ): Promise<CommunityPostsPageResponse>;

  createPost(request: CreateCommunityPostRequest): Promise<CommunityPost>;
  deletePost(postId: number): Promise<void>;
  archivePost(postId: number): Promise<CommunityPost>;
  unarchivePost(postId: number): Promise<CommunityPost>;

  getComments(postId: number): Promise<CommunityComment[]>;
  addComment(
    postId: number,
    request: CreateCommunityCommentRequest,
  ): Promise<CommunityComment>;
  deleteComment(postId: number, commentId: number): Promise<void>;

  /** currentlyLiked lets idempotent APIs choose like vs unlike; the legacy toggle ignores it. */
  toggleLike(postId: number, currentlyLiked?: boolean): Promise<ToggleCommunityLikeResponse>;

  // Global Community only (the legacy API has no equivalent).
  getConfig?(): Promise<CommunityClientConfig>;
  reportPost?(postId: number, reason: CommunityReportReason, details?: string): Promise<void>;
  reportComment?(commentId: number, reason: CommunityReportReason, details?: string): Promise<void>;
  hidePost?(postId: number, reason?: string): Promise<CommunityPost>;
  restorePost?(postId: number, reason?: string): Promise<CommunityPost>;
  hideComment?(commentId: number, scope?: string, reason?: string): Promise<void>;
  restoreComment?(commentId: number, scope?: string, reason?: string): Promise<void>;
}
