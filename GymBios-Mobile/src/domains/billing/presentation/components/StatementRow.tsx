import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { StatementLine } from '../../domain/Statement';
import { StatementLineType } from '../../domain/Statement';
import { MoneyText } from './MoneyText';

interface StatementRowProps {
  line: StatementLine;
  isLast: boolean;
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
 * One row in the Member Statement timeline.
 * Shows date, description, debit/credit columns and running balance.
 * Purely presentational.
 */
export const StatementRow = memo(function StatementRow({
  line,
  isLast,
}: StatementRowProps) {
  const isPayment = line.type === StatementLineType.Payment;
  const iconName: keyof typeof Feather.glyphMap = isPayment
    ? 'arrow-down-circle'
    : 'arrow-up-circle';
  const iconColor = isPayment ? '#16a34a' : '#dc2626';

  return (
    <View style={styles.container}>
      {/* Timeline line */}
      <View style={styles.timelineCol}>
        <View style={[styles.dot, { borderColor: iconColor }]}>
          <Feather name={iconName} size={14} color={iconColor} />
        </View>
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Content */}
      <View style={[styles.content, !isLast && styles.contentBorder]}>
        <View style={styles.topRow}>
          <View style={styles.descBlock}>
            <Typography variant="bodySmall" style={styles.description}>
              {line.description ?? (isPayment ? 'Payment Received' : 'Invoice')}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {formatDate(line.date)}
            </Typography>
            {line.receiptNo && (
              <Typography variant="caption" color="textSecondary">
                Ref: {line.receiptNo}
              </Typography>
            )}
          </View>

          <View style={styles.amountsBlock}>
            {(line.debit ?? 0) > 0 && (
              <View style={styles.amountRow}>
                <Typography variant="caption" color="textSecondary">
                  Dr{' '}
                </Typography>
                <MoneyText
                  amount={line.debit}
                  variant="caption"
                  color="#dc2626"
                />
              </View>
            )}
            {(line.credit ?? 0) > 0 && (
              <View style={styles.amountRow}>
                <Typography variant="caption" color="textSecondary">
                  Cr{' '}
                </Typography>
                <MoneyText
                  amount={line.credit}
                  variant="caption"
                  color="#16a34a"
                />
              </View>
            )}
            <View style={[styles.amountRow, styles.balanceRow]}>
              <Typography variant="caption" color="textSecondary">
                Bal{' '}
              </Typography>
              <MoneyText
                amount={line.balance}
                variant="caption"
                color={(line.balance ?? 0) > 0 ? '#b91c1c' : BrandColors.teal}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  timelineCol: {
    alignItems: 'center',
    width: 28,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: '#e5e7eb',
    marginVertical: 2,
    minHeight: 12,
  },
  content: {
    flex: 1,
    paddingBottom: Spacing.three,
  },
  contentBorder: {
    // visual separation handled by the timeline line
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  descBlock: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontWeight: '600',
    fontSize: 13,
  },
  amountsBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceRow: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 2,
    marginTop: 2,
  },
});
