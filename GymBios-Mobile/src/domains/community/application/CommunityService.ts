import type { CommunityRepository } from './CommunityRepository';
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

export class CommunityService {
  constructor(private readonly repository: CommunityRepository) {}

  getEngagementStats(): Promise<CommunityStats> {
    return this.repository.getEngagementStats();
  }

  getTrendingTopics(): Promise<TrendingTopic[]> {
    return this.repository.getTrendingTopics();
  }

  getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.repository.getLeaderboard();
  }

  getFeed(
    q?: string,
    type?: string,
    archived?: boolean,
    page?: number,
    limit?: number,
  ): Promise<CommunityPostsPageResponse> {
    return this.repository.getFeed(q, type, archived, page, limit);
  }

  createPost(request: CreateCommunityPostRequest): Promise<CommunityPost> {
    return this.repository.createPost(request);
  }

  deletePost(postId: number): Promise<void> {
    return this.repository.deletePost(postId);
  }

  archivePost(postId: number): Promise<CommunityPost> {
    return this.repository.archivePost(postId);
  }

  unarchivePost(postId: number): Promise<CommunityPost> {
    return this.repository.unarchivePost(postId);
  }

  getComments(postId: number): Promise<CommunityComment[]> {
    return this.repository.getComments(postId);
  }

  addComment(
    postId: number,
    request: CreateCommunityCommentRequest,
  ): Promise<CommunityComment> {
    return this.repository.addComment(postId, request);
  }

  deleteComment(postId: number, commentId: number): Promise<void> {
    return this.repository.deleteComment(postId, commentId);
  }

  toggleLike(postId: number): Promise<ToggleCommunityLikeResponse> {
    return this.repository.toggleLike(postId);
  }
}
