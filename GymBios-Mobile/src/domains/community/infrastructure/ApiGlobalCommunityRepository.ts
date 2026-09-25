import { apiClient } from '@/core/network/apiClient';
import type { CommunityRepository } from '../application/CommunityRepository';
import type {
  CommunityClientConfig,
  CommunityComment,
  CommunityPost,
  CommunityPostsPageResponse,
  CommunityReportReason,
  CommunityStats,
  CreateCommunityCommentRequest,
  CreateCommunityPostRequest,
  LeaderboardEntry,
  ToggleCommunityLikeResponse,
  TrendingTopic,
} from '../domain/community.types';
import { ApiCommunityRepository } from './ApiCommunityRepository';

const BASE = '/mobile/community';

/**
 * The GymBios-wide Community (/api/mobile/community). Maps the global API onto
 * the same domain model the screens already use, plus the server-computed
 * fields that only this API provides: ownership (isMine), per-post and
 * per-comment capabilities, and the author's gym.
 *
 * The gym a member posts as comes from the currently selected gym (sent as
 * X-Tenant-ID by the shared API client) and is verified by the server.
 */
export class ApiGlobalCommunityRepository implements CommunityRepository {
  /** Gym analytics stay gym-scoped (the old endpoint, served from the global store after cutover). */
  private readonly gymScoped = new ApiCommunityRepository();

  async getConfig(): Promise<CommunityClientConfig> {
    const { data } = await apiClient.get<any>(`${BASE}/config`, { skipGlobalErrorToast: true });
    return {
      available: data.available,
      readOnly: data.read_only,
      canPost: data.can_post,
      canComment: data.can_comment,
      canLike: data.can_like,
      canReport: data.can_report,
      moderation: data.moderation,
      limits: {
        topic: data.limits.topic,
        post: data.limits.post,
        comment: data.limits.comment,
        imageBytes: data.limits.image_bytes,
        imageDimension: data.limits.image_dimension,
        imageTypes: data.limits.image_types ?? [],
      },
      postingGymSlug: data.posting_gym_slug ?? null,
      postingGymName: data.posting_gym_name ?? null,
      postingBlockedReason: data.posting_blocked_reason ?? null,
    };
  }

  getEngagementStats(): Promise<CommunityStats> {
    return this.gymScoped.getEngagementStats();
  }

  async getTrendingTopics(): Promise<TrendingTopic[]> {
    const { data } = await apiClient.get<any[]>(`${BASE}/trending`);
    return data.map((t) => ({ topic: t.topic, postCount: t.post_count }));
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data } = await apiClient.get<any[]>(`${BASE}/leaderboard`);
    // The global leaderboard exposes no user IDs; the index is only a list key.
    return data.map((l, index) => ({
      userId: index,
      username: l.display_name,
      totalPosts: l.posts,
      totalLikes: l.likes,
      totalComments: l.comments,
      engagementScore: l.engagement_score,
    }));
  }

  async getFeed(
    q?: string,
    type?: string,
    archived?: boolean,
    pageParam?: number | string,
    limit: number = 20,
  ): Promise<CommunityPostsPageResponse> {
    const cursor = typeof pageParam === 'string' ? pageParam : undefined;
    const { data } = archived
      ? await apiClient.get<any>(`${BASE}/me/posts`, { params: { status: 'ARCHIVED', cursor, limit } })
      : await apiClient.get<any>(`${BASE}/feed`, {
          params: { cursor, limit, type: type && type !== 'all' ? type : undefined, q: q || undefined },
        });
    const posts: CommunityPost[] = data.posts.map((p: any) => this.mapPost(p));
    return {
      posts,
      // Cursor pagination: totals are unknown by design (no full-table counts on a global feed).
      pagination: { page: 0, limit, totalElements: posts.length, totalPages: 0 },
      nextPageParam: data.next_cursor ?? null,
    };
  }

  async createPost(request: CreateCommunityPostRequest): Promise<CommunityPost> {
    const { data } = await apiClient.post<any>(`${BASE}/posts`, {
      topic: request.topic,
      content: request.content,
      type: request.type,
      image: request.imageDataUrl
        ? {
            data_url: request.imageDataUrl,
            aspect_ratio: request.imageAspectRatio,
            crop_position: request.imageCropPosition,
            crop_zoom: request.imageCropZoom,
          }
        : undefined,
    });
    return this.mapPost(data);
  }

  async deletePost(postId: number): Promise<void> {
    await apiClient.delete(`${BASE}/posts/${postId}`);
  }

  async archivePost(postId: number): Promise<CommunityPost> {
    const { data } = await apiClient.post<any>(`${BASE}/posts/${postId}/archive`);
    return this.mapPost(data);
  }

  async unarchivePost(postId: number): Promise<CommunityPost> {
    const { data } = await apiClient.post<any>(`${BASE}/posts/${postId}/unarchive`);
    return this.mapPost(data);
  }

  async getComments(postId: number): Promise<CommunityComment[]> {
    const { data } = await apiClient.get<any[]>(`${BASE}/posts/${postId}/comments`);
    return data.map((c) => this.mapComment(c));
  }

  async addComment(postId: number, request: CreateCommunityCommentRequest): Promise<CommunityComment> {
    const { data } = await apiClient.post<any>(`${BASE}/posts/${postId}/comments`, { content: request.content });
    return this.mapComment(data);
  }

  async deleteComment(_postId: number, commentId: number): Promise<void> {
    await apiClient.delete(`${BASE}/comments/${commentId}`);
  }

  /** Idempotent on the server: liking twice or unliking twice changes nothing. */
  async toggleLike(postId: number, currentlyLiked?: boolean): Promise<ToggleCommunityLikeResponse> {
    const { data } = currentlyLiked
      ? await apiClient.delete<any>(`${BASE}/posts/${postId}/like`)
      : await apiClient.put<any>(`${BASE}/posts/${postId}/like`);
    return { liked: data.liked, likeCount: data.like_count };
  }

  async reportPost(postId: number, reason: CommunityReportReason, details?: string): Promise<void> {
    await apiClient.post(`${BASE}/posts/${postId}/report`, { reason, details });
  }

  async reportComment(commentId: number, reason: CommunityReportReason, details?: string): Promise<void> {
    await apiClient.post(`${BASE}/comments/${commentId}/report`, { reason, details });
  }

  async hidePost(postId: number, reason?: string): Promise<CommunityPost> {
    const { data } = await apiClient.post<any>(`${BASE}/posts/${postId}/hide`, { reason });
    return this.mapPost(data);
  }

  async restorePost(postId: number, reason?: string): Promise<CommunityPost> {
    const { data } = await apiClient.post<any>(`${BASE}/posts/${postId}/restore`, { reason });
    return this.mapPost(data);
  }

  async hideComment(commentId: number, scope?: string, reason?: string): Promise<void> {
    await apiClient.post(`${BASE}/comments/${commentId}/hide`, { scope, reason });
  }

  async restoreComment(commentId: number, scope?: string, reason?: string): Promise<void> {
    await apiClient.post(`${BASE}/comments/${commentId}/restore`, { scope, reason });
  }

  private mapPost(p: any): CommunityPost {
    return {
      id: p.id,
      topic: p.topic,
      content: p.content,
      type: p.type,
      likeCount: p.like_count,
      commentCount: p.comment_count,
      likedByMe: p.viewer?.liked_by_me ?? false,
      image: p.image
        ? {
            dataUrl: null,
            uri: absoluteUrl(p.image.url),
            headers: authHeaders(),
            aspectRatio: p.image.aspect_ratio,
            cropPosition: p.image.crop_position ?? null,
            cropZoom: p.image.crop_zoom ?? null,
          }
        : null,
      // The global API deliberately exposes no user IDs; ownership is isMine.
      authorUserId: 0,
      authorUsername: p.author?.display_name ?? 'GymBios member',
      authorRoles: p.author?.role ? [p.author.role] : [],
      createdAt: p.created_at,
      archived: p.status === 'ARCHIVED',
      isMine: p.author?.is_mine ?? false,
      status: p.status,
      visibility: p.visibility,
      authorGymName: p.author?.gym_name ?? null,
      authorBranchName: p.author?.branch_name ?? null,
      capabilities: {
        canLike: p.viewer?.can_like ?? false,
        canComment: p.viewer?.can_comment ?? false,
        canReport: p.viewer?.can_report ?? false,
        canArchive: p.viewer?.can_archive ?? false,
        canUnarchive: p.viewer?.can_unarchive ?? false,
        canDelete: p.viewer?.can_delete ?? false,
        canHide: p.viewer?.can_hide ?? false,
        canRestore: p.viewer?.can_restore ?? false,
      },
    };
  }

  private mapComment(c: any): CommunityComment {
    return {
      id: c.id,
      postId: c.post_id,
      content: c.content,
      authorUserId: 0,
      authorUsername: c.author?.display_name ?? 'GymBios member',
      authorRoles: c.author?.role ? [c.author.role] : [],
      createdAt: c.created_at,
      isMine: c.author?.is_mine ?? false,
      hidden: c.hidden ?? false,
      capabilities: {
        canDelete: c.viewer?.can_delete ?? false,
        canReport: c.viewer?.can_report ?? false,
        hideScopes: c.viewer?.hide_scopes ?? [],
        restoreScopes: c.viewer?.restore_scopes ?? [],
      },
    };
  }
}

/** Server image URLs are absolute paths (/api/...); resolve them against the API origin. */
function absoluteUrl(path: string): string {
  const base = apiClient.defaults.baseURL ?? '';
  const origin = base.replace(/\/api\/?$/, '');
  return origin + path;
}

/** Images are served behind authentication, like every other Community request. */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const auth = apiClient.defaults.headers.common.Authorization;
  const tenant = apiClient.defaults.headers.common['X-Tenant-ID'];
  if (typeof auth === 'string') headers.Authorization = auth;
  if (typeof tenant === 'string') headers['X-Tenant-ID'] = tenant;
  return headers;
}
