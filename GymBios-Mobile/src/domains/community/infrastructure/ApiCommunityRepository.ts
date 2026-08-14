import { apiClient } from '@/core/network/apiClient';
import type { CommunityRepository } from '../application/CommunityRepository';
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

export class ApiCommunityRepository implements CommunityRepository {
  async getEngagementStats(): Promise<CommunityStats> {
    const response = await apiClient.get<CommunityStats>('/community/stats');
    return response.data;
  }

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    const response = await apiClient.get<TrendingTopic[]>(
      '/community/stats/trending-topics',
    );
    return response.data;
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<LeaderboardEntry[]>(
      '/community/stats/leaderboard',
    );
    return response.data;
  }

  async getFeed(
    q?: string,
    type?: string,
    archived?: boolean,
    page: number = 1,
    limit: number = 20,
  ): Promise<CommunityPostsPageResponse> {
    const response = await apiClient.get<CommunityPostsPageResponse>(
      '/community/posts',
      {
        params: {
          q,
          type,
          archived,
          page,
          limit,
        },
      },
    );
    return response.data;
  }

  async createPost(
    request: CreateCommunityPostRequest,
  ): Promise<CommunityPost> {
    const response = await apiClient.post<CommunityPost>(
      '/community/posts',
      request,
    );
    return response.data;
  }

  async deletePost(postId: number): Promise<void> {
    await apiClient.delete(`/community/posts/${postId}`);
  }

  async archivePost(postId: number): Promise<CommunityPost> {
    const response = await apiClient.post<CommunityPost>(
      `/community/posts/${postId}/archive`,
    );
    return response.data;
  }

  async unarchivePost(postId: number): Promise<CommunityPost> {
    const response = await apiClient.post<CommunityPost>(
      `/community/posts/${postId}/unarchive`,
    );
    return response.data;
  }

  async getComments(postId: number): Promise<CommunityComment[]> {
    const response = await apiClient.get<CommunityComment[]>(
      `/community/posts/${postId}/comments`,
    );
    return response.data;
  }

  async addComment(
    postId: number,
    request: CreateCommunityCommentRequest,
  ): Promise<CommunityComment> {
    const response = await apiClient.post<CommunityComment>(
      `/community/posts/${postId}/comments`,
      request,
    );
    return response.data;
  }

  async deleteComment(postId: number, commentId: number): Promise<void> {
    await apiClient.delete(`/community/posts/${postId}/comments/${commentId}`);
  }

  async toggleLike(postId: number): Promise<ToggleCommunityLikeResponse> {
    const response = await apiClient.post<ToggleCommunityLikeResponse>(
      `/community/posts/${postId}/like`,
    );
    return response.data;
  }
}
