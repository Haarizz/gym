import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiMessagingRepository } from '../infrastructure/ApiMessagingRepository';
import { MessagingService } from '../application/MessagingService';
import type { 
  MessageTemplateRequest, 
  MessageGroupRequest, 
  SendMessageRequest 
} from '../domain/MessagingModels';

const repository = new ApiMessagingRepository();
const messagingService = new MessagingService(repository);

export const messagingKeys = {
  all: ['messaging'] as const,
  recipients: {
    all: ['messaging', 'recipients'] as const,
    list: (type?: string, search?: string) => [
      'messaging', 
      'recipients', 
      'list', 
      { type, search }
    ] as const,
  },
  templates: {
    all: ['messaging', 'templates'] as const,
  },
  groups: {
    all: ['messaging', 'groups'] as const,
  },
  history: {
    all: ['messaging', 'history'] as const,
    list: () => ['messaging', 'history', 'list'] as const,
    member: (memberId: number) => ['messaging', 'history', 'member', memberId] as const,
  },
  analytics: {
    all: ['messaging', 'analytics'] as const,
  },
};

// -- Recipients --

export function useMessagingRecipients(type?: string, search?: string) {
  return useQuery({
    queryKey: messagingKeys.recipients.list(type, search),
    queryFn: () => messagingService.getRecipients(type, search),
  });
}

// -- Templates --

export function useMessagingTemplates() {
  return useQuery({
    queryKey: messagingKeys.templates.all,
    queryFn: () => messagingService.getTemplates(),
  });
}

export function useCreateMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MessageTemplateRequest) => messagingService.createTemplate(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.templates.all });
    },
  });
}

export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: MessageTemplateRequest }) => 
      messagingService.updateTemplate(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.templates.all });
    },
  });
}

export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => messagingService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.templates.all });
    },
  });
}

// -- Groups --

export function useMessagingGroups() {
  return useQuery({
    queryKey: messagingKeys.groups.all,
    queryFn: () => messagingService.getGroups(),
  });
}

export function useCreateMessageGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: MessageGroupRequest) => messagingService.createGroup(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.groups.all });
    },
  });
}

export function useUpdateMessageGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: MessageGroupRequest }) => 
      messagingService.updateGroup(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.groups.all });
    },
  });
}

export function useDeleteMessageGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => messagingService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.groups.all });
    },
  });
}

// -- History --

export function useMessagingHistory() {
  return useQuery({
    queryKey: messagingKeys.history.list(),
    queryFn: () => messagingService.getHistory(),
  });
}

export function useMessagingMemberHistory(memberId: number) {
  return useQuery({
    queryKey: messagingKeys.history.member(memberId),
    queryFn: () => messagingService.getHistory(memberId),
  });
}

export function useDeleteMessageHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messagingService.deleteHistory(id),
    onSuccess: (_data, variables, _context) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.history.all });
      queryClient.invalidateQueries({ queryKey: messagingKeys.analytics.all });
    },
  });
}

// -- Analytics --

export function useMessagingAnalytics() {
  return useQuery({
    queryKey: messagingKeys.analytics.all,
    queryFn: () => messagingService.getAnalytics(),
  });
}

// -- Send Message --

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SendMessageRequest) => messagingService.sendMessage(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.history.all });
      queryClient.invalidateQueries({ queryKey: messagingKeys.analytics.all });
    },
  });
}
