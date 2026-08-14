import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

interface BillingSectionProps {
  title: string;
  children: React.ReactNode;
  /** Optional right-side element rendered next to the title. */
  action?: React.ReactNode;
}

/**
 * A titled section container used throughout the Billing module.
 * Purely presentational — no state, no side effects.
 */
export function BillingSection({ title, children, action }: BillingSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Typography variant="bodySmallBold" style={styles.title}>
          {title}
        </Typography>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
