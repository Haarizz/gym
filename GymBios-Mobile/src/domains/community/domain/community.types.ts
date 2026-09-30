export interface CommunityPostImage {
  dataUrl: string;
  aspectRatio: string;
  cropPosition: number | null;
  cropZoom: number | null;
}

export interface CommunityPost {
  id: number;
  topic: string;
  content: string;
  type: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  image: CommunityPostImage | null;
  /** Set for staff / gym-issued logins; null when a GymBios app member authored it. */
  authorUserId: number | null;
  /** Set when a GymBios app member authored it; null otherwise. */
  authorMemberId: number | null;
  /** Server-computed: user and member IDs are separate spaces, so never compare IDs client-side. */
  ownedByMe: boolean;
  authorUsername: string;
  authorRoles: string[];
  createdAt: string;
  archived: boolean;
}

export interface CommunityComment {
  id: number;
  postId: number;
  content: string;
  authorUserId: number | null;
  authorMemberId: number | null;
  ownedByMe: boolean;
  authorUsername: string;
  authorRoles: string[];
  createdAt: string;
}

export interface TypeBreakdown {
  type: string;
  posts: number;
  likes: number;
  comments: number;
}

export interface WeeklyPoint {
  weekLabel: string;
  posts: number;
  likes: number;
  comments: number;
}

export interface CommunityStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  byType: TypeBreakdown[];
  weekly: WeeklyPoint[];
}

export interface TrendingTopic {
  topic: string;
  postCount: number;
}

export interface LeaderboardEntry {
  userId: number | null;
  memberId: number | null;
  username: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  engagementScore: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
}

export interface CommunityPostsPageResponse {
  posts: CommunityPost[];
  pagination: PaginationInfo;
  /** False for app accounts without a (payment-approved) membership in this gym: read-only. */
  canPost: boolean;
}

export interface CreateCommunityPostRequest {
  topic: string;
  content: string;
  type: string;
  imageDataUrl?: string;
  imageAspectRatio?: string;
  imageCropPosition?: number;
  imageCropZoom?: number;
}

export interface CreateCommunityCommentRequest {
  content: string;
}

export interface ToggleCommunityLikeResponse {
  liked: boolean;
  likeCount: number;
}

/**
 * Backend notification module for likes/comments on the current user's posts
 * (CommunityService.NOTIFICATION_MODULE). referenceId on these is the post id.
 */
export const COMMUNITY_NOTIFICATION_MODULE = 'COMMUNITY_ACTIVITY';
