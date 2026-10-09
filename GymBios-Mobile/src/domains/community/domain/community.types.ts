/**
 * Which backend API serves the Community. 'global' is the GymBios-wide
 * Community (/api/mobile/community); 'legacy' is the old gym-scoped API, used
 * whenever the global one isn't available (older backends, before rollout).
 */
export type CommunityApiMode = 'legacy' | 'global';

export interface CommunityPostImage {
  /** Inline data: URL (legacy API only). */
  dataUrl: string | null;
  /** Authenticated image URL (global API only). */
  uri?: string;
  headers?: Record<string, string>;
  aspectRatio: string;
  cropPosition: number | null;
  cropZoom: number | null;
}

/** Server-computed actions for the current viewer (global API only). The server still enforces every one. */
export interface CommunityPostCapabilities {
  canLike: boolean;
  canComment: boolean;
  canReport: boolean;
  canArchive: boolean;
  canUnarchive: boolean;
  canDelete: boolean;
  canHide: boolean;
  canRestore: boolean;
}

export interface CommunityCommentCapabilities {
  canDelete: boolean;
  canReport: boolean;
  hideScopes: string[];
  restoreScopes: string[];
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
  /** Global API only: ownership computed by the server (never compare user IDs across identity spaces). */
  isMine?: boolean;
  capabilities?: CommunityPostCapabilities;
  status?: 'ACTIVE' | 'ARCHIVED' | 'HIDDEN';
  visibility?: 'PUBLIC' | 'GYM';
  authorGymName?: string | null;
  authorBranchName?: string | null;
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
  /** Global API only. */
  isMine?: boolean;
  hidden?: boolean;
  capabilities?: CommunityCommentCapabilities;
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
  /** Legacy feed only. May create posts: tenant logins, or app accounts with an active (payment-approved) membership in this gym. */
  canPost?: boolean;
  /** Legacy feed only. May like and comment: an active membership at any gym is enough. False means read-only. */
  canInteract?: boolean;
  /** Next page token: a page number (legacy) or an opaque cursor (global); null/undefined when there are no more. */
  nextPageParam?: number | string | null;
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

export type CommunityReportReason = 'SPAM' | 'HARASSMENT' | 'HATE' | 'NUDITY' | 'VIOLENCE' | 'SELF_HARM' | 'OTHER';

export interface CommunityLimits {
  topic: number;
  post: number;
  comment: number;
  imageBytes: number;
  imageDimension: number;
  imageTypes: string[];
}

/** What the global Community lets this user do right now (GET /mobile/community/config). */
export interface CommunityClientConfig {
  available: boolean;
  readOnly: boolean;
  canPost: boolean;
  canComment: boolean;
  canLike: boolean;
  canReport: boolean;
  moderation: boolean;
  limits: CommunityLimits;
  postingGymSlug: string | null;
  postingGymName: string | null;
  postingBlockedReason: string | null;
}
