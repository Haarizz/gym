import type { TFunction } from 'i18next';
import { BrandColors } from '@/core/theme';
import { formatDate } from '@/core/i18n';
import type { ChatSide, RefusalCode } from '../domain/types';

const KNOWN_CODES: readonly RefusalCode[] = [
  'MINOR', 'CHAT_BANNED', 'MEMBERSHIP_INACTIVE', 'STAFF_UNAVAILABLE', 'NOT_ACCEPTING',
  'MEMBER_UNAVAILABLE', 'MEMBER_OPTED_OUT', 'NOT_AT_BRANCH', 'BLOCKED', 'BLOCKED_BY_YOU',
  'BLOCKED_BY_MEMBER', 'MUTED', 'UNANSWERED_LIMIT', 'DAILY_LIMIT',
];

/**
 * Why sending / starting is refused, in the app's language. The backend's own message
 * (English) is the fallback for a code this build doesn't know.
 */
export function refusalText(
  t: TFunction,
  side: ChatSide,
  code: RefusalCode | null,
  serverMessage: string | null,
  name?: string | null,
): string {
  if (code && (KNOWN_CODES as readonly string[]).includes(code)) {
    // Staff have no daily message cap, only one on new conversations.
    const key = code === 'DAILY_LIMIT' && side === 'staff' ? 'DAILY_LIMIT_STAFF' : code;
    return t(`conversations.refusals.${key}` as never, { name: name ?? '' }) as string;
  }
  return serverMessage ?? t('conversations.chat.readOnly');
}

/** The role's colour: member gold, trainer amber, staff teal. */
export function chatAccent(roleGroup: string | undefined): { accent: string; onAccent: string; tint: string } {
  if (roleGroup === '(member)') return { accent: BrandColors.memberGold, onAccent: '#3A2A00', tint: '#FDF3D6' };
  if (roleGroup === '(trainer)') return { accent: BrandColors.trainerAmber, onAccent: '#FFFFFF', tint: '#FDF0DC' };
  return { accent: BrandColors.teal, onAccent: '#FFFFFF', tint: '#E1F3EE' };
}

/** The backend sends local date-times without a zone ("2026-11-01T10:15:00"). */
export function parseChatDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today" / "Yesterday" / "Mon, 27 Oct". */
export function dayLabel(t: TFunction, date: Date): string {
  const now = new Date();
  if (sameDay(date, now)) return t('conversations.chat.today');
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return t('conversations.chat.yesterday');
  return formatDate(date, date.getFullYear() === now.getFullYear() ? 'EEE, d MMM' : 'd MMM yyyy');
}

export function isSameDay(a: string, b: string): boolean {
  const da = parseChatDate(a);
  const db = parseChatDate(b);
  return !!da && !!db && sameDay(da, db);
}

/** A list row's time: the clock today, otherwise the day. */
export function listTime(t: TFunction, value: string | null): string {
  const d = parseChatDate(value);
  if (!d) return '';
  return sameDay(d, new Date()) ? formatDate(d, 'p') : dayLabel(t, d);
}
