import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { Bill } from '../../domain/Bill';
import { ReceiptStatus } from '../../domain/Receipt';
import { MoneyText } from './MoneyText';
import { PaymentStatusBadge } from './PaymentStatusBadge';

interface PendingBillCardProps {
  bill: Bill;
  isSelected: boolean;
  onToggle: (id: string) => void;
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
 * Selectable pending bill card.
 * Tapping toggles selection for multi-bill payment.
 * Purely presentational — no API calls.
 */
export const PendingBillCard = memo(function PendingBillCard({
  bill,
  isSelected,
  onToggle,
}: PendingBillCardProps) {
  const isOverdue = bill.status === ReceiptStatus.Overdue;

  return (
    <Pressable
      onPress={() => onToggle(bill.id)}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`Bill ${bill.receiptNo ?? bill.id}, ${bill.planName}, due ${bill.dueAmount}`}
    >
      {/* Checkbox */}
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Feather name="check" size={14} color="#ffffff" />}
      </View>

      {/* Bill info */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Typography variant="bodySmall" style={styles.billNo}>
            {bill.receiptNo ?? `Bill #${bill.id}`}
          </Typography>
          <PaymentStatusBadge status={bill.status} />
        </View>

        <Typography variant="caption" color="textSecondary">
          {bill.planName ?? 'Membership Plan'}
        </Typography>

        <View style={styles.bottomRow}>
          <View style={styles.dueInfo}>
            <Feather
              name="calendar"
              size={11}
              color={isOverdue ? '#b91c1c' : BrandColors.textSecondary}
            />
            <Typography
              variant="caption"
              style={isOverdue ? styles.overdueDateText : undefined}
              color={isOverdue ? undefined : 'textSecondary'}
            >
              Due {formatDate(bill.dueDate)}
            </Typography>
          </View>

          <View style={styles.amounts}>
            <Typography variant="caption" color="textSecondary">
              Billed:{' '}
            </Typography>
            <MoneyText amount={bill.amount} variant="caption" />
            {(bill.totalPaidToDate ?? 0) > 0 && (
              <>
                <Typography variant="caption" color="textSecondary">
                  {' '}· Paid:{' '}
                </Typography>
                <MoneyText amount={bill.totalPaidToDate} variant="caption" />
              </>
            )}
          </View>
        </View>
      </View>

      {/* Outstanding amount */}
      <View style={styles.outstanding}>
        <MoneyText
          amount={bill.dueAmount}
          variant="bodySmallBold"
          color={isOverdue ? '#b91c1c' : BrandColors.teal}
        />
        <Typography variant="caption" color="textSecondary">
          due
        </Typography>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardSelected: {
    borderColor: BrandColors.teal,
    backgroundColor: '#eef7f6',
  },
  pressed: { opacity: 0.82 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BrandColors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: BrandColors.teal,
    borderColor: BrandColors.teal,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billNo: {
    fontWeight: '600',
    fontSize: 13,
  },
  bottomRow: {
    gap: 4,
  },
  dueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueDateText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  outstanding: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
