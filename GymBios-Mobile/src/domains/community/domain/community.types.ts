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
  authorUserId: number;
  authorUsername: string;
  authorRoles: string[];
  createdAt: string;
  archived: boolean;
}

export interface CommunityComment {
  id: number;
  postId: number;
  content: string;
  authorUserId: number;
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
  userId: number;
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
