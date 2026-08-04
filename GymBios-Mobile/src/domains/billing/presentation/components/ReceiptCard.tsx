import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { Receipt } from '../../domain/Receipt';
import { MoneyText } from './MoneyText';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PaymentMethodBadge } from './PaymentMethodBadge';

interface ReceiptCardProps {
  receipt: Receipt;
  onPress: (receipt: Receipt) => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Compact receipt list card. Renders member name, receipt number,
 * amount, method, status, and date. Purely presentational.
 */
export const ReceiptCard = memo(function ReceiptCard({ receipt, onPress }: ReceiptCardProps) {
  return (
    <Pressable
      onPress={() => onPress(receipt)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Receipt ${receipt.receiptNo ?? receipt.id}, ${receipt.memberName}, amount ${receipt.amount}`}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Typography variant="bodySmallBold" style={styles.receiptNo}>
            {receipt.receiptNo ?? `#${receipt.id}`}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {formatDate(receipt.transactionDate)}
          </Typography>
        </View>
        <PaymentStatusBadge status={receipt.status} />
      </View>

      {/* Member */}
      <View style={styles.memberRow}>
        <View style={styles.avatarPlaceholder}>
          <Typography variant="caption" style={styles.avatarInitial}>
            {(receipt.memberName ?? 'M')[0].toUpperCase()}
          </Typography>
        </View>
        <View style={styles.memberInfo}>
          <Typography variant="bodySmall" style={styles.memberName}>
            {receipt.memberName ?? '—'}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {receipt.memberId ?? receipt.memberPhone ?? '—'}
          </Typography>
        </View>
      </View>

      {/* Footer row */}
      <View style={styles.footer}>
        <MoneyText amount={receipt.amount} variant="bodySmallBold" color={BrandColors.teal} />
        <PaymentMethodBadge method={receipt.paymentMethod} />
        <Feather name="chevron-right" size={14} color={BrandColors.textSecondary} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.82,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    gap: 2,
  },
  receiptNo: {
    fontSize: 13,
    color: BrandColors.textPrimary,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    gap: 1,
  },
  memberName: {
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
});
