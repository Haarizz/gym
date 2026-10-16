import { formatDate, i18n } from '@/core/i18n';

export function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) {
    return i18n.t('notifications.justNow');
  }
  if (diffMin < 60) {
    return i18n.t('notifications.minutesAgo', { count: diffMin });
  }
  if (diffHours < 24) {
    return i18n.t('notifications.hoursAgo', { count: diffHours });
  }
  if (diffDays === 1) {
    return i18n.t('notifications.yesterday');
  }
  if (diffDays < 7) {
    return i18n.t('notifications.daysAgo', { count: diffDays });
  }

  // Fallback to formatted date e.g. "Oct 12"
  return formatDate(date, 'MMM d');
}

/** Compact stamp for tight rows: "Now", "5m", "3h", "Yesterday", "4d", "Oct 12". */
export function formatShortTime(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return i18n.t('notifications.now');
  if (diffMin < 60) return i18n.t('notifications.shortMinutes', { count: diffMin });
  if (diffHours < 24) return i18n.t('notifications.shortHours', { count: diffHours });
  if (diffDays === 1) return i18n.t('notifications.yesterday');
  if (diffDays < 7) return i18n.t('notifications.shortDays', { count: diffDays });
  return formatDate(date, 'MMM d');
}
