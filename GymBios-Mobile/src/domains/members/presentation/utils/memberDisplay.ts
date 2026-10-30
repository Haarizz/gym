import i18n from '@/core/i18n/i18n';
import { formatDate } from '@/core/i18n';
import type { Member } from '../../domain/Member';

export interface Tone {
  label: string;
  color: string;
}

const NEUTRAL = '#6b7280';

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',
  expired: '#dc2626',
  frozen: '#0284c7',
  suspended: '#ea580c',
  pending_approval: '#d97706',
  inactive: NEUTRAL,
};

const PAYMENT_COLORS: Record<string, string> = {
  paid: '#16a34a',
  partial: '#2563eb',
  pending: '#d97706',
  overdue: '#dc2626',
};

export function titleCase(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getMemberExpiry(member: Member): string | undefined {
  return member.endDate ?? member.expiryDate;
}

/** Days from today until the given date; negative once it has passed. */
export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Nothing on the backend flips membership_status to "expired" when the end date passes,
 * so mirror its list filter: an active member past their end date reads as Expired.
 */
export function getMemberStatusTone(member: Member): Tone {
  const status = (member.status ?? '').toLowerCase();
  const left = daysUntil(getMemberExpiry(member));
  const isExp = status === 'active' && left !== null && left < 0;
  // Staff suspension wins over everything, as on the backend (MemberAccessState).
  const key = member.membershipSuspended ? 'suspended' : isExp ? 'expired' : status;
  const color = STATUS_COLORS[key] ?? NEUTRAL;

  const statusKeyMap: Record<string, string> = {
    active: 'members.statuses.active',
    expired: 'members.statuses.expired',
    frozen: 'members.statuses.frozen',
    inactive: 'members.statuses.inactive',
    suspended: 'members.statuses.suspended',
    pending_approval: 'members.statuses.pendingApproval',
  };

  const label = statusKeyMap[key] && i18n.exists(statusKeyMap[key])
    ? i18n.t(statusKeyMap[key] as never)
    : titleCase(key) || '—';

  return { label, color };
}

export function getPaymentStatusTone(status?: string | null): Tone {
  const key = (status ?? '').toLowerCase();
  const color = PAYMENT_COLORS[key] ?? NEUTRAL;

  const paymentKeyMap: Record<string, string> = {
    paid: 'members.paymentStatuses.paid',
    partial: 'members.paymentStatuses.partial',
    pending: 'members.paymentStatuses.pending',
    overdue: 'members.paymentStatuses.overdue',
  };

  const label = paymentKeyMap[key] && i18n.exists(paymentKeyMap[key])
    ? i18n.t(paymentKeyMap[key] as never)
    : titleCase(status) || '—';

  return { label, color };
}

export function formatMemberDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatDate(date, 'd MMM yyyy');
}

export function describeDaysLeft(days: number | null): string {
  if (days === null) return i18n.t('members.display.noExpiry');
  if (days === 0) return i18n.t('members.display.expiresToday');
  if (days > 0) return i18n.t('members.display.daysLeft', { count: days });
  const ago = -days;
  return i18n.t('members.display.expiredAgo', { count: ago });
}

export function getInitials(name?: string | null): string {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Local calendar date as YYYY-MM-DD — toISOString() would shift it across timezones. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}
