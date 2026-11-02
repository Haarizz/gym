import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { conversationsApi } from '../infrastructure/conversationsApi';
import type { ChatMessage, ChatSide, ChatTarget, Conversation, ReportReason, StaffInbox } from '../domain/types';

const PAGE_SIZE = 30;
/** Chat has no socket: an open chat re-checks this often (pushes cover the rest). */
const OPEN_CHAT_POLL_MS = 5_000;
const LIST_POLL_MS = 15_000;

export const conversationKeys = {
  all: ['conversations'] as const,
  side: (side: ChatSide) => [...conversationKeys.all, side] as const,
  unread: (side: ChatSide) => [...conversationKeys.side(side), 'unread'] as const,
  inbox: (inbox: StaffInbox) => [...conversationKeys.side('staff'), 'inbox', inbox] as const,
  members: (search: string) => [...conversationKeys.side('staff'), 'members', search] as const,
  lookup: (side: ChatSide, target: ChatTarget) => [...conversationKeys.side(side), 'lookup', target] as const,
  detail: (side: ChatSide, id: number) => [...conversationKeys.side(side), 'detail', id] as const,
  messages: (side: ChatSide, id: number) => [...conversationKeys.side(side), 'messages', id] as const,
  chatSwitch: (side: ChatSide) => [...conversationKeys.side(side), 'switch'] as const,
};

/** Refreshes the lists and the badge after anything that changes a conversation's summary. */
function invalidateSummaries(queryClient: ReturnType<typeof useQueryClient>, side: ChatSide) {
  queryClient.invalidateQueries({ queryKey: conversationKeys.unread(side) });
  if (side === 'staff') {
    queryClient.invalidateQueries({ queryKey: [...conversationKeys.side('staff'), 'inbox'] });
    queryClient.invalidateQueries({ queryKey: [...conversationKeys.side('staff'), 'members'] });
  }
}

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

// ── Lists ─────────────────────────────────────────────────────────────────

export function useUnreadChatCount(side: ChatSide, enabled = true) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: conversationKeys.unread(side),
    queryFn: () => conversationsApi.unreadCount(side),
    enabled,
    refetchInterval: focused && enabled ? LIST_POLL_MS : false,
    retry: false,
  });
}

export function useStaffInbox(inbox: StaffInbox, enabled = true) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: conversationKeys.inbox(inbox),
    queryFn: () => conversationsApi.staffList(inbox),
    enabled,
    refetchInterval: focused && enabled ? LIST_POLL_MS : false,
  });
}

export function useStaffChatMembers(search: string) {
  return useQuery({
    queryKey: conversationKeys.members(search.trim()),
    queryFn: () => conversationsApi.staffMembers(search),
    placeholderData: keepPreviousData,
  });
}

// ── One chat ──────────────────────────────────────────────────────────────

/** Who a chat is with before it exists: the thread (if any) and whether one can be started. */
export function useChatLookup(side: ChatSide, target: ChatTarget) {
  return useQuery({
    queryKey: conversationKeys.lookup(side, target),
    queryFn: () => {
      switch (target.kind) {
        case 'staff':
          return conversationsApi.memberLookup(target.staffId);
        case 'frontDesk':
          return conversationsApi.memberLookup(undefined);
        case 'member':
          return conversationsApi.staffLookup(target.memberId);
        default:
          throw new Error('An open conversation needs no lookup');
      }
    },
    enabled: target.kind !== 'conversation',
  });
}

export function useConversation(side: ChatSide, id: number | null) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: conversationKeys.detail(side, id ?? 0),
    queryFn: () => conversationsApi.get(side, id!),
    enabled: id != null,
    refetchInterval: focused ? OPEN_CHAT_POLL_MS : false,
  });
}

/** Newest first, a page at a time going back. Only the newest page is polled. */
export function useChatMessages(side: ChatSide, id: number | null) {
  const focused = useIsFocused();
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: conversationKeys.messages(side, id ?? 0),
    queryFn: ({ pageParam }) => conversationsApi.messages(side, id!, pageParam, PAGE_SIZE),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.length < PAGE_SIZE ? undefined : last[last.length - 1].id),
    enabled: id != null,
  });

  // Polling the infinite query would refetch every page; fetch just the latest page and
  // merge what's new (or changed, e.g. deleted) into the first page instead.
  useEffect(() => {
    if (id == null || !focused) return;
    const key = conversationKeys.messages(side, id);
    const tick = async () => {
      try {
        const latest = await conversationsApi.messages(side, id, undefined, PAGE_SIZE);
        queryClient.setQueryData<InfiniteData<ChatMessage[], number | undefined>>(key, (data) =>
          data ? mergeLatest(data, latest) : data,
        );
      } catch {
        // The next tick tries again; errors already toast where it matters.
      }
    };
    const timer = setInterval(tick, OPEN_CHAT_POLL_MS);
    return () => clearInterval(timer);
  }, [side, id, focused, queryClient]);

  return query;
}

/** Replaces the overlapping part of the loaded messages with the latest page. */
function mergeLatest(
  data: InfiniteData<ChatMessage[], number | undefined>,
  latest: ChatMessage[],
): InfiniteData<ChatMessage[], number | undefined> {
  if (latest.length === 0) return data;
  const oldest = latest[latest.length - 1].id;
  const [first = [], ...rest] = data.pages;
  // Page boundaries (and so pageParams) stay as they were; only the overlap is replaced.
  return {
    ...data,
    pages: [
      [...latest, ...first.filter((m) => m.id < oldest)],
      ...rest.map((page) => page.filter((m) => m.id < oldest)),
    ],
  };
}

/** Pins a message just sent at the bottom of the chat without waiting for the next poll. */
function prependMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  side: ChatSide,
  id: number,
  message: ChatMessage,
) {
  queryClient.setQueryData<InfiniteData<ChatMessage[], number | undefined>>(
    conversationKeys.messages(side, id),
    (data) => {
      if (!data) return { pages: [[message]], pageParams: [undefined] };
      const [first = [], ...rest] = data.pages;
      if (first.some((m) => m.id === message.id)) return data;
      return { ...data, pages: [[message, ...first], ...rest] };
    },
  );
}

/**
 * Sends a message. With no conversation yet, the first message starts it (as the
 * member to this staff member / the front desk, or as the staff member to this member)
 * and the new conversation is returned so the screen can switch to it.
 */
export function useSendChatMessage(side: ChatSide, target: ChatTarget, conversationId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string): Promise<{ conversation: Conversation | null; message: ChatMessage | null }> => {
      if (conversationId != null) {
        return { conversation: null, message: await conversationsApi.send(side, conversationId, body) };
      }
      let conversation: Conversation;
      if (target.kind === 'staff') conversation = await conversationsApi.memberStart(target.staffId, body);
      else if (target.kind === 'frontDesk') conversation = await conversationsApi.memberStart(undefined, body);
      else if (target.kind === 'member') conversation = await conversationsApi.staffStart(target.memberId, body);
      else throw new Error('Nothing to start');
      return { conversation, message: null };
    },
    onSuccess: ({ conversation, message }) => {
      if (conversation) {
        queryClient.setQueryData(conversationKeys.detail(side, conversation.id), conversation);
        queryClient.invalidateQueries({ queryKey: conversationKeys.lookup(side, target) });
        queryClient.invalidateQueries({ queryKey: conversationKeys.messages(side, conversation.id) });
      } else if (message && conversationId != null) {
        prependMessage(queryClient, side, conversationId, message);
        // canSend may have changed (e.g. the unanswered-messages cap).
        queryClient.invalidateQueries({ queryKey: conversationKeys.detail(side, conversationId) });
      }
      invalidateSummaries(queryClient, side);
      if (side === 'member') queryClient.invalidateQueries({ queryKey: ['memberTeam'] });
    },
  });
}

export function useMarkChatRead(side: ChatSide) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => conversationsApi.markRead(side, id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Conversation>(conversationKeys.detail(side, id), (c) => (c ? { ...c, unread: 0 } : c));
      invalidateSummaries(queryClient, side);
    },
  });
}

export function useDeleteChatMessage(side: ChatSide, id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: number) => conversationsApi.deleteMessage(side, id, messageId),
    onSuccess: (_, messageId) => {
      queryClient.setQueryData<InfiniteData<ChatMessage[], number | undefined>>(
        conversationKeys.messages(side, id),
        (data) => data && {
          ...data,
          pages: data.pages.map((p) => p.map((m) => (m.id === messageId ? { ...m, body: null, deleted: true } : m))),
        },
      );
      invalidateSummaries(queryClient, side);
    },
  });
}

export function useReportChatMessage(side: ChatSide, id: number) {
  return useMutation({
    mutationFn: (v: { messageId: number; reason: ReportReason; details: string }) =>
      conversationsApi.report(side, id, v.messageId, v.reason, v.details),
  });
}

/** Member app: block or unblock a staff member's conversation. */
export function useSetChatBlocked(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blocked: boolean) => conversationsApi.setBlocked(id, blocked),
    onSuccess: (c) => {
      queryClient.setQueryData(conversationKeys.detail('member', id), c);
      queryClient.invalidateQueries({ queryKey: ['memberTeam'] });
    },
  });
}

/** Staff app: stop the member sending here for 7 days, or lift it. */
export function useSetChatMuted(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (muted: boolean) => conversationsApi.setMuted(id, muted),
    onSuccess: (c) => {
      queryClient.setQueryData(conversationKeys.detail('staff', id), c);
      invalidateSummaries(queryClient, 'staff');
    },
  });
}

// ── Settings ──────────────────────────────────────────────────────────────

/** Members: "Let staff start chats". Staff and trainers: "Accept messages from members". */
export function useChatSwitch(side: ChatSide, enabled = true) {
  return useQuery({
    queryKey: conversationKeys.chatSwitch(side),
    queryFn: () => conversationsApi.getChatSwitch(side),
    enabled,
    retry: false,
  });
}

/** Flips the switch at once and puts it back if the save fails. */
export function useSetChatSwitch(side: ChatSide) {
  const queryClient = useQueryClient();
  const key = conversationKeys.chatSwitch(side);
  return useMutation({
    mutationFn: (on: boolean) => conversationsApi.setChatSwitch(side, on),
    onMutate: async (on) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<boolean>(key);
      queryClient.setQueryData(key, on);
      return { previous };
    },
    onError: (_e, _on, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (on) => {
      queryClient.setQueryData(key, on);
      // Members' Message buttons depend on staff's switch; staff's member list on members'.
      if (side === 'staff') queryClient.invalidateQueries({ queryKey: [...conversationKeys.side('staff'), 'members'] });
    },
  });
}
