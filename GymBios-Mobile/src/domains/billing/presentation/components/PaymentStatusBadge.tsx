import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { ReceiptStatus } from '../../domain/Receipt';

interface PaymentStatusBadgeProps {
  status: ReceiptStatus | string | undefined;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  [ReceiptStatus.Paid]: {
    bg: '#dcfce7',
    text: '#15803d',
    border: '#86efac',
    label: 'Paid',
  },
  [ReceiptStatus.Pending]: {
    bg: '#fef9c3',
    text: '#854d0e',
    border: '#fde047',
    label: 'Pending',
  },
  [ReceiptStatus.Overdue]: {
    bg: '#fee2e2',
    text: '#b91c1c',
    border: '#fca5a5',
    label: 'Overdue',
  },
  [ReceiptStatus.Partial]: {
    bg: '#e0f2fe',
    text: '#0369a1',
    border: '#7dd3fc',
    label: 'Partial',
  },
};

const DEFAULT_CONFIG = {
  bg: '#f3f4f6',
  text: '#374151',
  border: '#e5e7eb',
  label: '—',
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = status ? STATUS_CONFIG[status] ?? DEFAULT_CONFIG : DEFAULT_CONFIG;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
      accessibilityLabel={`Status: ${config.label}`}
    >
      <Typography variant="caption" style={[styles.text, { color: config.text }]}>
        {config.label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
