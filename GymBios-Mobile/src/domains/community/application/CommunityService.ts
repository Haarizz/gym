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
  CommunityClientConfig,
  CommunityReportReason,
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
    pageParam?: number | string,
    limit?: number,
  ): Promise<CommunityPostsPageResponse> {
    return this.repository.getFeed(q, type, archived, pageParam, limit);
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

  toggleLike(postId: number, currentlyLiked?: boolean): Promise<ToggleCommunityLikeResponse> {
    return this.repository.toggleLike(postId, currentlyLiked);
  }

  getConfig(): Promise<CommunityClientConfig> {
    if (!this.repository.getConfig) return unsupported();
    return this.repository.getConfig();
  }

  reportPost(postId: number, reason: CommunityReportReason, details?: string): Promise<void> {
    if (!this.repository.reportPost) return unsupported();
    return this.repository.reportPost(postId, reason, details);
  }

  reportComment(commentId: number, reason: CommunityReportReason, details?: string): Promise<void> {
    if (!this.repository.reportComment) return unsupported();
    return this.repository.reportComment(commentId, reason, details);
  }

  hidePost(postId: number, reason?: string): Promise<CommunityPost> {
    if (!this.repository.hidePost) return unsupported();
    return this.repository.hidePost(postId, reason);
  }

  restorePost(postId: number, reason?: string): Promise<CommunityPost> {
    if (!this.repository.restorePost) return unsupported();
    return this.repository.restorePost(postId, reason);
  }

  hideComment(commentId: number, scope?: string, reason?: string): Promise<void> {
    if (!this.repository.hideComment) return unsupported();
    return this.repository.hideComment(commentId, scope, reason);
  }

  restoreComment(commentId: number, scope?: string, reason?: string): Promise<void> {
    if (!this.repository.restoreComment) return unsupported();
    return this.repository.restoreComment(commentId, scope, reason);
  }
}

/** Global-only operations are never offered in legacy mode; reaching one there is a programming error. */
function unsupported(): Promise<never> {
  return Promise.reject(new Error('This action is not supported by the connected Community API'));
}
