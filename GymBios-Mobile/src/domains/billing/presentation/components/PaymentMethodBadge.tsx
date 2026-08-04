import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { PaymentMethod } from '../../domain/Receipt';

interface PaymentMethodBadgeProps {
  method: PaymentMethod | string | undefined;
}

const METHOD_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  [PaymentMethod.Cash]: { bg: '#f0fdf4', text: '#166534', icon: '💵' },
  [PaymentMethod.Card]: { bg: '#eff6ff', text: '#1e40af', icon: '💳' },
  [PaymentMethod.Online]: { bg: '#fdf4ff', text: '#7e22ce', icon: '📱' },
  [PaymentMethod.Wallet]: { bg: '#fff7ed', text: '#9a3412', icon: '👛' },
  [PaymentMethod.BankTransfer]: { bg: '#f0f9ff', text: '#0c4a6e', icon: '🏦' },
  [PaymentMethod.Cheque]: { bg: '#fefce8', text: '#713f12', icon: '📄' },
  [PaymentMethod.Mixed]: { bg: '#fdf2f8', text: '#86198f', icon: '🔀' },
  [PaymentMethod.Credit]: { bg: '#fff1f2', text: '#9f1239', icon: '🏷️' },
};

const DEFAULT_CONFIG = { bg: '#f3f4f6', text: '#374151', icon: '💰' };

export function PaymentMethodBadge({ method }: PaymentMethodBadgeProps) {
  const config = method ? METHOD_CONFIG[method] ?? DEFAULT_CONFIG : DEFAULT_CONFIG;
  const label = method ?? '—';

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg }]}
      accessibilityLabel={`Payment method: ${label}`}
    >
      <Typography variant="caption" style={[styles.text, { color: config.text }]}>
        {config.icon} {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
