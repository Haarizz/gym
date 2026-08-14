/**
 * Shared formatting helpers for the Attendance presentation layer.
 */

export function getInitials(name = ''): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAvgDuration(minutes?: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatDateLabel(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function getDisplayName(record: {
  memberName?: string;
  walkInName?: string;
}): string {
  return record.memberName || record.walkInName || 'Visitor';
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}
