import { API_BASE_URL } from './api';

export type CommunityPostType = 'achievement' | 'question' | 'tip';

export interface CommunityPostImage {
  dataUrl: string;
  aspectRatio?: string | null;
  cropPosition?: number | null;
  cropZoom?: number | null;
}

export interface CommunityPost {
  id: number;
  topic: string;
  content: string;
  type: CommunityPostType;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  image?: CommunityPostImage | null;
  authorUserId: number;
  authorUsername: string;
  authorRoles: string[];
  createdAt: string;
  archived?: boolean;
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

export interface CommunityPostsPage {
  posts: CommunityPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const withAuth = (token?: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

const normalizeImage = (raw: any): CommunityPostImage | null => {
  if (!raw) return null;
  return {
    dataUrl: raw.dataUrl ?? raw.data_url ?? null,
    aspectRatio: raw.aspectRatio ?? raw.aspect_ratio ?? null,
    cropPosition: raw.cropPosition ?? raw.crop_position ?? null,
    cropZoom: raw.cropZoom ?? raw.crop_zoom ?? null,
  };
};

const normalizePost = (raw: any): CommunityPost => ({
  id: Number(raw.id),
  topic: raw.topic ?? '',
  content: raw.content ?? '',
  type: (raw.type ?? 'achievement') as CommunityPostType,
  likeCount: raw.likeCount ?? raw.like_count ?? 0,
  commentCount: raw.commentCount ?? raw.comment_count ?? 0,
  likedByMe: raw.likedByMe ?? raw.liked_by_me ?? false,
  image: normalizeImage(raw.image),
  authorUserId: Number(raw.authorUserId ?? raw.author_user_id ?? 0),
  authorUsername: raw.authorUsername ?? raw.author_username ?? 'Unknown',
  authorRoles: raw.authorRoles ?? raw.author_roles ?? [],
  createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  archived: raw.archived ?? false,
});

const normalizeComment = (raw: any): CommunityComment => ({
  id: Number(raw.id),
  postId: Number(raw.postId ?? raw.post_id ?? 0),
  content: raw.content ?? '',
  authorUserId: Number(raw.authorUserId ?? raw.author_user_id ?? 0),
  authorUsername: raw.authorUsername ?? raw.author_username ?? 'Unknown',
  authorRoles: raw.authorRoles ?? raw.author_roles ?? [],
  createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
});

const normalizePagination = (raw: any) => ({
  page: raw?.page ?? 1,
  limit: raw?.limit ?? 20,
  total: raw?.total ?? 0,
  totalPages: raw?.totalPages ?? raw?.total_pages ?? 1,
});

const ensureOk = async (response: Response) => {
  if (response.ok) return;
  const body = await response.json().catch(() => ({}));
  const message = (body as any)?.message || `Request failed (${response.status})`;
  throw new Error(message);
};

export async function fetchCommunityPosts(params: {
  q?: string;
  type?: 'all' | CommunityPostType;
  page?: number;
  limit?: number;
  archived?: boolean;
  token?: string | null;
}): Promise<CommunityPostsPage> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.archived) query.set('archived', 'true');
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));

  const response = await fetch(`${API_BASE_URL}/community/posts?${query.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      ...withAuth(params.token),
    },
  });
  await ensureOk(response);
  const raw = await response.json();
  return {
    posts: (raw?.posts ?? []).map(normalizePost),
    pagination: normalizePagination(raw?.pagination),
  };
}

export async function createCommunityPost(params: {
  topic: string;
  content: string;
  type?: CommunityPostType;
  token: string;
  imageDataUrl?: string;
  imageAspectRatio?: string;
}): Promise<CommunityPost> {
  const body: Record<string, unknown> = {
    topic: params.topic,
    content: params.content,
    type: params.type ?? 'achievement',
  };
  if (params.imageDataUrl) {
    body.imageDataUrl = params.imageDataUrl;
    body.imageAspectRatio = params.imageAspectRatio ?? null;
  }
  const response = await fetch(`${API_BASE_URL}/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withAuth(params.token),
    },
    body: JSON.stringify(body),
  });
  await ensureOk(response);
  const raw = await response.json();
  return normalizePost(raw);
}

export async function fetchCommunityComments(params: {
  postId: number;
  token?: string | null;
}): Promise<CommunityComment[]> {
  const response = await fetch(`${API_BASE_URL}/community/posts/${params.postId}/comments`, {
    headers: {
      'Content-Type': 'application/json',
      ...withAuth(params.token),
    },
  });
  await ensureOk(response);
  const raw = await response.json();
  return (raw ?? []).map(normalizeComment);
}

export async function addCommunityComment(params: {
  postId: number;
  content: string;
  token: string;
}): Promise<CommunityComment> {
  const response = await fetch(`${API_BASE_URL}/community/posts/${params.postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withAuth(params.token),
    },
    body: JSON.stringify({ content: params.content }),
  });
  await ensureOk(response);
  const raw = await response.json();
  return normalizeComment(raw);
}

export async function toggleCommunityLike(params: {
  postId: number;
  token: string;
}): Promise<{ liked: boolean; likeCount: number }> {
  const response = await fetch(`${API_BASE_URL}/community/posts/${params.postId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withAuth(params.token),
    },
  });
  await ensureOk(response);
  const raw = await response.json();
  return {
    liked: raw?.liked ?? false,
    likeCount: raw?.likeCount ?? raw?.like_count ?? 0,
  };
}

export async function deleteCommunityPost(params: { postId: number; token: string }): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    ...withAuth(params.token),
  };

  // Prefer POST alias for reliability (some environments block HTTP DELETE).
  try {
    const postResponse = await fetch(`${API_BASE_URL}/community/posts/${params.postId}/delete`, {
      method: 'POST',
      headers,
    });
    if (postResponse.ok) return;

    if (postResponse.status !== 404 && postResponse.status !== 405) {
      await ensureOk(postResponse);
    }
  } catch {
    // Network/proxy failure on POST. We'll fallback to DELETE below.
  }

  const delResponse = await fetch(`${API_BASE_URL}/community/posts/${params.postId}`, {
    method: 'DELETE',
    headers,
  });
  await ensureOk(delResponse);
}

export async function setCommunityPostArchived(params: {
  postId: number;
  archived: boolean;
  token: string;
}): Promise<CommunityPost> {
  const action = params.archived ? 'archive' : 'unarchive';
  const response = await fetch(`${API_BASE_URL}/community/posts/${params.postId}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...withAuth(params.token),
    },
  });
  await ensureOk(response);
  const raw = await response.json().catch(() => ({}));
  return normalizePost(raw);
}

export async function deleteCommunityComment(params: {
  postId: number;
  commentId: number;
  token: string;
}): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    ...withAuth(params.token),
  };

  // Prefer POST alias for reliability (some environments block HTTP DELETE).
  try {
    const postResponse = await fetch(
      `${API_BASE_URL}/community/posts/${params.postId}/comments/${params.commentId}/delete`,
      {
        method: 'POST',
        headers,
      }
    );
    if (postResponse.ok) return;

    if (postResponse.status !== 404 && postResponse.status !== 405) {
      await ensureOk(postResponse);
    }
  } catch {
    // Network/proxy failure on POST. We'll fallback to DELETE below.
  }

  const response = await fetch(`${API_BASE_URL}/community/posts/${params.postId}/comments/${params.commentId}`, {
    method: 'DELETE',
    headers,
  });
  await ensureOk(response);
}
