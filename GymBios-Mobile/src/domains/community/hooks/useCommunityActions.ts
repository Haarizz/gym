import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { communityKeys, useCommunityMode } from './useCommunity';
import type {
  CommunityReportReason,
  CreateCommunityPostRequest,
  CreateCommunityCommentRequest,
} from '../domain/community.types';

/** Posts changed: every feed, plus the aggregates derived from them. */
function invalidatePosts(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
  queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
  queryClient.invalidateQueries({ queryKey: communityKeys.trendingTopics() });
  queryClient.invalidateQueries({ queryKey: communityKeys.leaderboard() });
}

export function useCreateCommunityPost() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: (request: CreateCommunityPostRequest) => service.createPost(request),
    onSuccess: () => invalidatePosts(queryClient),
  });
}

export function useAddCommunityComment() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: ({
      postId,
      request,
    }: {
      postId: number;
      request: CreateCommunityCommentRequest;
    }) => service.addComment(postId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comments(variables.postId) });
      // Comment counts live on the feed items.
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
    },
  });
}

export function useToggleCommunityLike() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: ({ postId, liked }: { postId: number; liked: boolean }) => service.toggleLike(postId, liked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
    },
  });
}

export function useDeleteCommunityPost() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: (postId: number) => service.deletePost(postId),
    onSuccess: () => invalidatePosts(queryClient),
  });
}

export function useDeleteCommunityComment() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: ({
      postId,
      commentId,
    }: {
      postId: number;
      commentId: number;
    }) => service.deleteComment(postId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comments(variables.postId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
    },
  });
}

export function useArchiveCommunityPost() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: (postId: number) => service.archivePost(postId),
    onSuccess: () => invalidatePosts(queryClient),
  });
}

export function useUnarchiveCommunityPost() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: (postId: number) => service.unarchivePost(postId),
    onSuccess: () => invalidatePosts(queryClient),
  });
}

// ── Global Community only (offered only when the server says the viewer may) ──

export function useReportCommunityPost() {
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: ({ postId, reason, details }: { postId: number; reason: CommunityReportReason; details?: string }) =>
      service.reportPost(postId, reason, details),
  });
}

export function useReportCommunityComment() {
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: ({ commentId, reason, details }: { commentId: number; reason: CommunityReportReason; details?: string }) =>
      service.reportComment(commentId, reason, details),
  });
}

export function useModerateCommunityPost() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: ({ postId, action, reason }: { postId: number; action: 'hide' | 'restore'; reason?: string }) =>
      action === 'hide' ? service.hidePost(postId, reason) : service.restorePost(postId, reason),
    onSuccess: () => invalidatePosts(queryClient),
  });
}

export function useModerateCommunityComment() {
  const queryClient = useQueryClient();
  const { service } = useCommunityMode();

  return useMutation({
    mutationFn: ({
      commentId,
      action,
      scope,
      reason,
    }: {
      postId: number;
      commentId: number;
      action: 'hide' | 'restore';
      scope?: string;
      reason?: string;
    }) => (action === 'hide' ? service.hideComment(commentId, scope, reason) : service.restoreComment(commentId, scope, reason)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.comments(variables.postId) });
    },
  });
}
