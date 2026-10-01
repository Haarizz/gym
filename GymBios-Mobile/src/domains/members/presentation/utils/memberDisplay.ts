import type { Member } from '../../domain/Member';

export interface Tone {
  label: string;
  color: string;
}

const NEUTRAL = '#6b7280';

// Keys are the lowercase values the backend stores (membership_status / payment_status).
const MEMBER_STATUS_TONES: Record<string, Tone> = {
  active: { label: 'Active', color: '#16a34a' },
  expired: { label: 'Expired', color: '#dc2626' },
  frozen: { label: 'Frozen', color: '#0284c7' },
  suspended: { label: 'Suspended', color: '#ea580c' },
  pending_approval: { label: 'Pending Approval', color: '#d97706' },
  inactive: { label: 'Inactive', color: NEUTRAL },
};

const PAYMENT_STATUS_TONES: Record<string, Tone> = {
  paid: { label: 'Paid', color: '#16a34a' },
  partial: { label: 'Partial', color: '#2563eb' },
  pending: { label: 'Pending', color: '#d97706' },
  overdue: { label: 'Overdue', color: '#dc2626' },
};

export function titleCase(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toTone(map: Record<string, Tone>, value?: string | null): Tone {
  const key = (value ?? '').toLowerCase();
  return map[key] ?? { label: titleCase(value) || '—', color: NEUTRAL };
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
  if (status === 'active' && left !== null && left < 0) {
    return MEMBER_STATUS_TONES.expired;
  }
  return toTone(MEMBER_STATUS_TONES, member.status);
}

export function getPaymentStatusTone(status?: string | null): Tone {
  return toTone(PAYMENT_STATUS_TONES, status);
}

export function formatMemberDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function describeDaysLeft(days: number | null): string {
  if (days === null) return 'No expiry set';
  if (days === 0) return 'Expires today';
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} left`;
  const ago = -days;
  return `Expired ${ago} day${ago === 1 ? '' : 's'} ago`;
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
