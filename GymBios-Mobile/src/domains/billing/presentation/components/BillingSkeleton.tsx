import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';

/**
 * Skeleton loader for Billing screens.
 * Renders shimmer-like grey blocks while data loads.
 * Accepts variant to match different screen layouts.
 */

interface BillingSkeletonProps {
  variant?: 'overview' | 'list' | 'detail';
  count?: number;
}

function SkeletonBlock({
  height,
  width,
  style,
}: {
  height: number;
  width?: number | string;
  style?: any;
}) {
  return (
    <View
      style={[
        {
          height,
          width: width ?? '100%',
          backgroundColor: '#e5e7eb',
          borderRadius: Radius.sm,
        },
        style,
      ]}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <SkeletonBlock height={14} width="55%" />
        <SkeletonBlock height={20} width={60} />
      </View>
      <View style={styles.skeletonRow}>
        <SkeletonBlock height={32} width={32} style={{ borderRadius: Radius.full }} />
        <View style={styles.skeletonTextGroup}>
          <SkeletonBlock height={12} width="60%" />
          <SkeletonBlock height={10} width="40%" />
        </View>
      </View>
      <View style={styles.skeletonRow}>
        <SkeletonBlock height={14} width={80} />
        <SkeletonBlock height={20} width={72} />
      </View>
    </View>
  );
}

function SkeletonStatRow() {
  return (
    <View style={styles.skeletonStatRow}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonStatCard}>
          <SkeletonBlock height={36} width={36} style={{ borderRadius: Radius.sm }} />
          <SkeletonBlock height={14} width="80%" />
          <SkeletonBlock height={10} width="60%" />
        </View>
      ))}
    </View>
  );
}

export function BillingSkeleton({
  variant = 'list',
  count = 5,
}: BillingSkeletonProps) {
  return (
    <View style={styles.container}>
      {variant === 'overview' && (
        <>
          <SkeletonStatRow />
          <SkeletonBlock height={16} width="40%" style={{ marginTop: Spacing.three }} />
        </>
      )}
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  skeletonCard: {
    backgroundColor: '#f9fafe',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  skeletonTextGroup: {
    flex: 1,
    gap: 4,
  },
  skeletonStatRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  skeletonStatCard: {
    flex: 1,
    backgroundColor: '#f9fafe',
    borderRadius: Radius.md,
    padding: Spacing.two,
    alignItems: 'center',
    gap: 4,
  },
});
