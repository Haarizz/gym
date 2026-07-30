import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'EXCELLENT'
  | 'ON_TRACK'
  | 'PRESENT'
  | 'ABSENT';

interface StatusBadgeProps {
  status: StatusType | string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  INACTIVE: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  EXCELLENT: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  ON_TRACK: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  PRESENT: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  ABSENT: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status.toUpperCase()] ?? {
    bg: '#f3f4f6',
    text: '#374151',
    border: '#e5e7eb',
  };
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = getStatusStyle(status);

  return (
    <View style={[styles.badge, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Typography variant="caption" style={[styles.text, { color: style.text }]}>
        {status.toUpperCase()}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
});