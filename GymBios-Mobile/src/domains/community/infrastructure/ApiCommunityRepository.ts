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
    const response = await apiClient.get<any>('/community/stats');
    return {
      totalPosts: response.data.total_posts,
      totalLikes: response.data.total_likes,
      totalComments: response.data.total_comments,
      byType: response.data.by_type || [],
      weekly: response.data.weekly?.map((w: any) => ({
        weekLabel: w.week_label,
        posts: w.posts,
        likes: w.likes,
        comments: w.comments
      })) || []
    };
  }

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    const response = await apiClient.get<any[]>(
      '/community/stats/trending-topics',
    );
    return response.data.map(t => ({
      topic: t.topic,
      postCount: t.post_count
    }));
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<any[]>(
      '/community/stats/leaderboard',
    );
    return response.data.map(l => ({
      userId: l.user_id,
      username: l.username,
      totalPosts: l.total_posts,
      totalLikes: l.total_likes,
      totalComments: l.total_comments,
      engagementScore: l.engagement_score
    }));
  }

  async getFeed(
    q?: string,
    type?: string,
    archived?: boolean,
    page: number = 1,
    limit: number = 20,
  ): Promise<CommunityPostsPageResponse> {
    const response = await apiClient.get<any>(
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
    
    const posts = response.data.posts.map(this.mapCommunityPost);
    return {
      posts,
      pagination: {
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        totalElements: response.data.pagination.total,
        totalPages: response.data.pagination.total_pages,
      }
    };
  }

  async createPost(
    request: CreateCommunityPostRequest,
  ): Promise<CommunityPost> {
    const payload = {
      topic: request.topic,
      content: request.content,
      type: request.type,
      image_data_url: request.imageDataUrl,
      image_aspect_ratio: request.imageAspectRatio,
      image_crop_position: request.imageCropPosition,
      image_crop_zoom: request.imageCropZoom,
    };
    const response = await apiClient.post<any>(
      '/community/posts',
      payload,
    );
    return this.mapCommunityPost(response.data);
  }

  private mapCommunityPost(data: any): CommunityPost {
    return {
      id: data.id,
      topic: data.topic,
      content: data.content,
      type: data.type,
      likeCount: data.like_count,
      commentCount: data.comment_count,
      likedByMe: data.liked_by_me,
      image: data.image ? {
        dataUrl: data.image.data_url,
        aspectRatio: data.image.aspect_ratio,
        cropPosition: data.image.crop_position,
        cropZoom: data.image.crop_zoom,
      } : null,
      authorUserId: data.author_user_id,
      authorUsername: data.author_username,
      authorRoles: data.author_roles,
      createdAt: data.created_at,
      archived: data.archived,
    };
  }

  async deletePost(postId: number): Promise<void> {
    await apiClient.delete(`/community/posts/${postId}`);
  }

  async archivePost(postId: number): Promise<CommunityPost> {
    const response = await apiClient.post<any>(
      `/community/posts/${postId}/archive`,
    );
    return this.mapCommunityPost(response.data);
  }

  async unarchivePost(postId: number): Promise<CommunityPost> {
    const response = await apiClient.post<any>(
      `/community/posts/${postId}/unarchive`,
    );
    return this.mapCommunityPost(response.data);
  }

  async getComments(postId: number): Promise<CommunityComment[]> {
    const response = await apiClient.get<any[]>(
      `/community/posts/${postId}/comments`,
    );
    return response.data.map(this.mapCommunityComment);
  }

  async addComment(
    postId: number,
    request: CreateCommunityCommentRequest,
  ): Promise<CommunityComment> {
    const response = await apiClient.post<any>(
      `/community/posts/${postId}/comments`,
      request,
    );
    return this.mapCommunityComment(response.data);
  }

  private mapCommunityComment(data: any): CommunityComment {
    return {
      id: data.id,
      postId: data.post_id,
      content: data.content,
      authorUserId: data.author_user_id,
      authorUsername: data.author_username,
      authorRoles: data.author_roles,
      createdAt: data.created_at,
    };
  }

  async deleteComment(postId: number, commentId: number): Promise<void> {
    await apiClient.delete(`/community/posts/${postId}/comments/${commentId}`);
  }

  async toggleLike(postId: number): Promise<ToggleCommunityLikeResponse> {
    const response = await apiClient.post<any>(
      `/community/posts/${postId}/like`,
    );
    return {
      liked: response.data.liked,
      likeCount: response.data.like_count,
    };
  }
}
