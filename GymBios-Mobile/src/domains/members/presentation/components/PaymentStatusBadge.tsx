import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface PaymentStatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PAID: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  PENDING: { bg: '#fef9c3', text: '#a16207', border: '#fef08a' },
  OVERDUE: { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
  PARTIAL: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status.toUpperCase()] ?? {
    bg: '#f3f4f6',
    text: '#374151',
    border: '#e5e7eb',
  };
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
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