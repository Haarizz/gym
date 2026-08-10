import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiCommunityRepository } from '../infrastructure/ApiCommunityRepository';
import { communityKeys } from './useCommunity';
import type {
  CreateCommunityPostRequest,
  CreateCommunityCommentRequest,
} from '../domain/community.types';
import { CommunityService } from '../application/CommunityService';

const repository = new ApiCommunityRepository();
const communityService = new CommunityService(repository);

export function useCreateCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateCommunityPostRequest) =>
      communityService.createPost(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
    },
  });
}

export function useAddCommunityComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      request,
    }: {
      postId: number;
      request: CreateCommunityCommentRequest;
    }) => communityService.addComment(postId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.comments(variables.postId),
      });
      // Invalidate feeds to update comment counts
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
    },
  });
}

export function useToggleCommunityLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => communityService.toggleLike(postId),
    onSuccess: () => {
      // Invalidate feeds to update like counts
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
    },
  });
}

export function useDeleteCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => communityService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
      queryClient.invalidateQueries({ queryKey: communityKeys.trendingTopics() });
      queryClient.invalidateQueries({ queryKey: communityKeys.leaderboard() });
    },
  });
}

export function useDeleteCommunityComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      commentId,
    }: {
      postId: number;
      commentId: number;
    }) => communityService.deleteComment(postId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.comments(variables.postId),
      });
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
    },
  });
}

export function useArchiveCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => communityService.archivePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
      queryClient.invalidateQueries({ queryKey: communityKeys.trendingTopics() });
      queryClient.invalidateQueries({ queryKey: communityKeys.leaderboard() });
    },
  });
}

export function useUnarchiveCommunityPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) => communityService.unarchivePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      queryClient.invalidateQueries({ queryKey: communityKeys.stats() });
      queryClient.invalidateQueries({ queryKey: communityKeys.trendingTopics() });
      queryClient.invalidateQueries({ queryKey: communityKeys.leaderboard() });
    },
  });
}
