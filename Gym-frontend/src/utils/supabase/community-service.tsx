import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface CommunityTypeBreakdown {
  type: string;
  posts: number;
  likes: number;
  comments: number;
}

export interface CommunityWeeklyPoint {
  weekLabel: string;
  posts: number;
  likes: number;
  comments: number;
}

export interface CommunityEngagementStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  byType: CommunityTypeBreakdown[];
  weekly: CommunityWeeklyPoint[];
}

class CommunityService {
  async getEngagementStats(): Promise<CommunityEngagementStats> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/community/stats`, {
      method: "GET",
    });
    if (!res.ok) throw new Error("Failed to fetch community engagement stats");
    const d = await res.json();
    return {
      totalPosts: d.totalPosts ?? 0,
      totalLikes: d.totalLikes ?? 0,
      totalComments: d.totalComments ?? 0,
      byType: (d.byType ?? []).map((t: any) => ({
        type: t.type,
        posts: t.posts ?? 0,
        likes: t.likes ?? 0,
        comments: t.comments ?? 0,
      })),
      weekly: (d.weekly ?? []).map((w: any) => ({
        weekLabel: w.weekLabel,
        posts: w.posts ?? 0,
        likes: w.likes ?? 0,
        comments: w.comments ?? 0,
      })),
    };
  }
}

export const communityService = new CommunityService();
