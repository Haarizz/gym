import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { MoneyText } from './MoneyText';

interface BillingSummaryCardProps {
  label: string;
  value: number;
  iconName: keyof typeof Feather.glyphMap;
  iconBg: string;
  /** How to render the value: currency amount (default), percentage, or plain count. */
  format?: 'money' | 'percent' | 'count';
  /** Accent colour for the value text. */
  valueColor?: string;
}

/**
 * Compact dashboard stat tile used in the Billing Overview grid:
 * tinted icon on the left, value + label stacked on the right.
 */
export function BillingSummaryCard({
  label,
  value,
  iconName,
  iconBg,
  format = 'money',
  valueColor,
}: BillingSummaryCardProps) {
  const valueStyle = [styles.value, valueColor ? { color: valueColor } : null];


  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${iconBg}1f` }]}>
        <Feather name={iconName} size={16} color={iconBg} />
      </View>

      <View style={styles.text}>
        {format === 'money' ? (
          <MoneyText amount={value} variant="bodySmallBold" color={valueColor} style={styles.value} numberOfLines={1} />
        ) : (
          <Typography variant="bodySmallBold" style={valueStyle} numberOfLines={1}>
            {format === 'percent' ? `${value.toFixed(1)}%` : Math.round(value).toLocaleString()}
          </Typography>
        )}
        <Typography variant="caption" color="textSecondary" numberOfLines={1}>
          {label}
        </Typography>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  value: {
    fontSize: 15,
    color: BrandColors.textPrimary,
  },
});
