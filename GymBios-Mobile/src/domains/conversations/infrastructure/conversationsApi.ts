import { apiClient } from '@/core/network/apiClient';

import type {
  ChatMember,
  ChatMessage,
  ChatSide,
  Conversation,
  ConversationLookup,
  Participant,
  ReportReason,
  StaffInbox,
} from '../domain/types';

// Wire format is snake_case both ways (spring.jackson.property-naming-strategy=SNAKE_CASE).

function mapParticipant(d: any): Participant | null {
  if (!d) return null;
  return {
    id: d.id,
    name: d.name ?? '',
    role: d.role ?? null,
    photoUrl: d.photo_url ?? null,
    memberCode: d.member_code ?? null,
  };
}

export function mapConversation(d: any): Conversation {
  return {
    id: d.id,
    frontDesk: !!d.front_desk,
    member: mapParticipant(d.member),
    staff: mapParticipant(d.staff),
    startedBy: d.started_by ?? null,
    lastMessageAt: d.last_message_at ?? null,
    lastMessagePreview: d.last_message_preview ?? null,
    lastSender: d.last_sender ?? null,
    unread: d.unread ?? 0,
    canSend: !!d.can_send,
    cannotSendCode: d.cannot_send_code ?? null,
    cannotSendMessage: d.cannot_send_message ?? null,
    recipientOnDuty: d.recipient_on_duty ?? null,
    mutedUntil: d.muted_until ?? null,
    blockedByMember: !!d.blocked_by_member,
    blockedByAdmin: !!d.blocked_by_admin,
  };
}

function mapMessage(d: any): ChatMessage {
  return {
    id: d.id,
    senderType: d.sender_type,
    senderName: d.sender_name ?? null,
    mine: !!d.mine,
    body: d.body ?? null,
    deleted: !!d.deleted,
    masked: !!d.masked,
    createdAt: d.created_at,
  };
}

function mapLookup(d: any): ConversationLookup {
  return {
    conversation: d.conversation ? mapConversation(d.conversation) : null,
    canStart: !!d.can_start,
    cannotStartCode: d.cannot_start_code ?? null,
    cannotStartMessage: d.cannot_start_message ?? null,
  };
}

function mapMember(d: any): ChatMember {
  return {
    id: d.id,
    name: d.name ?? '',
    photoUrl: d.photo_url ?? null,
    memberCode: d.member_code ?? null,
    conversationId: d.conversation_id ?? null,
    unread: d.unread ?? 0,
    canStart: !!d.can_start,
    cannotStartCode: d.cannot_start_code ?? null,
    cannotStartMessage: d.cannot_start_message ?? null,
  };
}

const base = (side: ChatSide) => `/mobile/${side}/conversations`;

/** The endpoints both apps share; the member and staff paths differ only in their prefix. */
export const conversationsApi = {
  async get(side: ChatSide, id: number): Promise<Conversation> {
    const res = await apiClient.get<any>(`${base(side)}/${id}`);
    return mapConversation(res.data);
  },

  /** Newest first. */
  async messages(side: ChatSide, id: number, beforeId?: number, limit = 30): Promise<ChatMessage[]> {
    const res = await apiClient.get<any[]>(`${base(side)}/${id}/messages`, {
      params: { before_id: beforeId, limit },
    });
    return (res.data ?? []).map(mapMessage);
  },

  async send(side: ChatSide, id: number, body: string): Promise<ChatMessage> {
    const res = await apiClient.post<any>(`${base(side)}/${id}/messages`, { body });
    return mapMessage(res.data);
  },

  async markRead(side: ChatSide, id: number): Promise<void> {
    await apiClient.post(`${base(side)}/${id}/read`, undefined, { skipGlobalErrorToast: true });
  },

  async deleteMessage(side: ChatSide, id: number, messageId: number): Promise<void> {
    await apiClient.delete(`${base(side)}/${id}/messages/${messageId}`);
  },

  async report(side: ChatSide, id: number, messageId: number, reason: ReportReason, details: string): Promise<void> {
    await apiClient.post(`${base(side)}/${id}/messages/${messageId}/report`, {
      reason,
      details: details.trim() || undefined,
    });
  },

  async unreadCount(side: ChatSide): Promise<number> {
    const res = await apiClient.get<{ count: number }>(`${base(side)}/unread-count`, { skipGlobalErrorToast: true });
    return res.data?.count ?? 0;
  },

  /**
   * The caller's own chat switch: for a member, whether staff may start chats with
   * them; for staff, whether members may start chats with them. Existing chats carry on.
   */
  async getChatSwitch(side: ChatSide): Promise<boolean> {
    const res = await apiClient.get<any>(`${base(side)}/settings`, { skipGlobalErrorToast: true });
    const value = side === 'member' ? res.data?.allow_staff_chats : res.data?.accepts_member_messages;
    return value !== false;
  },

  async setChatSwitch(side: ChatSide, on: boolean): Promise<boolean> {
    const body = side === 'member' ? { allow_staff_chats: on } : { accepts_member_messages: on };
    const res = await apiClient.put<any>(`${base(side)}/settings`, body);
    const value = side === 'member' ? res.data?.allow_staff_chats : res.data?.accepts_member_messages;
    return value !== false;
  },

  // ── Member app ──────────────────────────────────────────────────────────

  /** staffId omitted = the front desk. */
  async memberLookup(staffId?: number): Promise<ConversationLookup> {
    const res = await apiClient.get<any>(`${base('member')}/lookup`, { params: { staff_id: staffId } });
    return mapLookup(res.data);
  },

  /** Starts the thread with a first message, or adds to the existing one. */
  async memberStart(staffId: number | undefined, body: string): Promise<Conversation> {
    const res = await apiClient.post<any>(base('member'), { staff_id: staffId ?? null, body });
    return mapConversation(res.data);
  },

  async setBlocked(id: number, blocked: boolean): Promise<Conversation> {
    const url = `${base('member')}/${id}/block`;
    const res = blocked ? await apiClient.post<any>(url) : await apiClient.delete<any>(url);
    return mapConversation(res.data);
  },

  // ── Staff app ───────────────────────────────────────────────────────────

  async staffList(inbox: StaffInbox = 'all'): Promise<Conversation[]> {
    const res = await apiClient.get<any[]>(base('staff'), { params: { inbox } });
    return (res.data ?? []).map(mapConversation);
  },

  async staffMembers(search: string): Promise<ChatMember[]> {
    const res = await apiClient.get<any[]>(`${base('staff')}/members`, {
      params: { search: search.trim() || undefined },
    });
    return (res.data ?? []).map(mapMember);
  },

  async staffLookup(memberId: number): Promise<ConversationLookup> {
    const res = await apiClient.get<any>(`${base('staff')}/lookup`, { params: { member_id: memberId } });
    return mapLookup(res.data);
  },

  async staffStart(memberId: number, body: string): Promise<Conversation> {
    const res = await apiClient.post<any>(base('staff'), { member_id: memberId, body });
    return mapConversation(res.data);
  },

  async setMuted(id: number, muted: boolean): Promise<Conversation> {
    const url = `${base('staff')}/${id}/mute`;
    const res = muted ? await apiClient.post<any>(url) : await apiClient.delete<any>(url);
    return mapConversation(res.data);
  },
};
