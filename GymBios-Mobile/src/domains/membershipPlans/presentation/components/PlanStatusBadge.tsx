import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ACTIVE:   { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  INACTIVE: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  DRAFT:    { bg: '#fef9c3', text: '#92400e', border: '#fde68a' },
  ARCHIVED: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

function getStyle(status: string) {
  return (
    STATUS_STYLES[status.toUpperCase()] ?? {
      bg: '#f3f4f6',
      text: '#374151',
      border: '#e5e7eb',
    }
  );
}

interface PlanStatusBadgeProps {
  status: string;
}

export function PlanStatusBadge({ status }: PlanStatusBadgeProps) {
  const style = getStyle(status);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: style.bg, borderColor: style.border },
      ]}
    >
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
