import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface PaymentSummaryCardProps {
  title: string;
  subtitle?: string;
  amount: number;
  currency?: string;
}

export function PaymentSummaryCard({
  title,
  subtitle,
  amount,
  currency = '₹',
}: PaymentSummaryCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftContainer}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: theme.primary + '15' },
            ]}
          >
            <Feather name="shopping-bag" size={20} color={theme.primary} />
          </View>
          <View style={styles.textGroup}>
            <Typography variant="bodySmallBold" style={{ color: theme.text }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography
                variant="caption"
                style={{ color: theme.textSecondary, marginTop: 2 }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </View>
        </View>

        <View style={styles.amountContainer}>
          <Typography
            variant="caption"
            style={{ color: theme.textSecondary, textAlign: 'right' }}
          >
            Total Amount
          </Typography>
          <Typography
            variant="subtitle"
            style={[styles.amountText, { color: theme.primary }]}
          >
            {currency} {amount.toFixed(2)}
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.two,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
  },
  textGroup: {
    flex: 1,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontWeight: '700',
    marginTop: 2,
  },
});
