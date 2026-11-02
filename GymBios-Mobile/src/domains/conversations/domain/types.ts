/**
 * Member ↔ staff chat (backend: services/conversations, /api/mobile/{member,staff}/conversations).
 * Separate from the `messaging` domain, which is staff bulk SMS / email / WhatsApp.
 */

/** Which app is talking: a member, or a staff member / trainer. */
export type ChatSide = 'member' | 'staff';

export type SenderType = 'MEMBER' | 'STAFF';

/** Must match ConversationPolicyService's refusal codes; labels live under conversations.refusals.* */
export type RefusalCode =
  | 'MINOR'
  | 'CHAT_BANNED'
  | 'MEMBERSHIP_INACTIVE'
  | 'STAFF_UNAVAILABLE'
  | 'NOT_ACCEPTING'
  | 'MEMBER_UNAVAILABLE'
  | 'MEMBER_OPTED_OUT'
  | 'NOT_AT_BRANCH'
  | 'BLOCKED'
  | 'BLOCKED_BY_YOU'
  | 'BLOCKED_BY_MEMBER'
  | 'MUTED'
  | 'UNANSWERED_LIMIT'
  | 'DAILY_LIMIT';

/** Report reasons the backend accepts; labels live under conversations.report.reasons.* */
export const REPORT_REASONS = ['HARASSMENT', 'SPAM', 'INAPPROPRIATE', 'OFF_PLATFORM', 'OTHER'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const MESSAGE_MAX_LENGTH = 1000;
export const REPORT_DETAILS_MAX_LENGTH = 500;
/** Sent by ConversationNotifier with data.conversationId. */
export const CONVERSATION_PUSH_TYPE = 'conversation_message';

/** The other side of a conversation. No phone or email: chat stays in the app. */
export interface Participant {
  id: number;
  name: string;
  role: string | null;
  photoUrl: string | null;
  /** Members only: the gym's member code. */
  memberCode: string | null;
}

export interface Conversation {
  id: number;
  /** A member's thread with the shared front desk rather than a named staff member. */
  frontDesk: boolean;
  /** Filled for the staff app. */
  member: Participant | null;
  /** Filled for the member app; null for the front desk. */
  staff: Participant | null;
  startedBy: SenderType | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastSender: SenderType | null;
  unread: number;
  canSend: boolean;
  cannotSendCode: RefusalCode | null;
  cannotSendMessage: string | null;
  /** Member app only: whether anyone who'd answer is on shift now. */
  recipientOnDuty: boolean | null;
  mutedUntil: string | null;
  blockedByMember: boolean;
  blockedByAdmin: boolean;
}

export interface ChatMessage {
  id: number;
  senderType: SenderType;
  senderName: string | null;
  mine: boolean;
  /** Null once deleted. */
  body: string | null;
  deleted: boolean;
  /** Contact details were hidden from what was typed. */
  masked: boolean;
  createdAt: string;
}

/** Before a chat exists: the thread with that person (if any) and whether one may be started. */
export interface ConversationLookup {
  conversation: Conversation | null;
  canStart: boolean;
  cannotStartCode: RefusalCode | null;
  cannotStartMessage: string | null;
}

/** One row of the staff app's member list. */
export interface ChatMember {
  id: number;
  name: string;
  photoUrl: string | null;
  memberCode: string | null;
  /** The caller's own thread with this member, if there is one. */
  conversationId: number | null;
  unread: number;
  canStart: boolean;
  cannotStartCode: RefusalCode | null;
  cannotStartMessage: string | null;
}

export type StaffInbox = 'all' | 'mine' | 'front_desk';

/**
 * Who a chat screen is with. Exactly one applies: an existing conversation, or the
 * person to look up (a staff member / the front desk for members, a member for staff).
 */
export type ChatTarget =
  | { kind: 'conversation'; conversationId: number }
  | { kind: 'staff'; staffId: number }
  | { kind: 'frontDesk' }
  | { kind: 'member'; memberId: number };

/** Stable per-person colour for an initials avatar. */
const AVATAR_COLORS = ['#F5B73C', '#7C5CF5', '#2F8A73', '#E07B53', '#4C7BD9'];
export function avatarColor(id: number): string {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

export function initialsOf(name: string | null | undefined): string {
  return (name ?? '').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}
