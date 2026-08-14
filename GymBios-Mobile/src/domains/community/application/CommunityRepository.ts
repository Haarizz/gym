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
} from '../domain/community.types';

export interface CommunityRepository {
  getEngagementStats(): Promise<CommunityStats>;
  getTrendingTopics(): Promise<TrendingTopic[]>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;

  getFeed(
    q?: string,
    type?: string,
    archived?: boolean,
    page?: number,
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

  toggleLike(postId: number): Promise<ToggleCommunityLikeResponse>;
}
