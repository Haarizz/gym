import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Surface, Typography } from '@/shared/components';
import type { CollectionPeriod, CollectionsData } from '../../domain/communityAnalyticsData.types';

interface CommunityCollectionsProps {
  collections?: CollectionsData;
}

export function CommunityCollections({ collections }: CommunityCollectionsProps) {
  const [period, setPeriod] = useState<CollectionPeriod>('today');

  const currentData = collections?.[period] ?? {
    membership: 0,
    addons: 0,
    pos: 0,
    total: 0,
  };

  const total = currentData.total > 0 ? currentData.total : 1;
  const membershipPct = Math.round((currentData.membership / total) * 100);
  const addonsPct = Math.round((currentData.addons / total) * 100);
  const posPct = Math.round((currentData.pos / total) * 100);

  const periods: { key: CollectionPeriod; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'thisMonth', label: 'This Month' },
  ];

  return (
    <Surface background="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View>
          <Typography variant="bodySmallBold" style={styles.title}>
            Total Collections
          </Typography>
          <Typography variant="subtitle" style={styles.totalValue}>
            ₹{currentData.total.toLocaleString()}
          </Typography>
        </View>

        {/* Period Selector Pills */}
        <View style={styles.pillContainer}>
          {periods.map(p => {
            const isActive = period === p.key;
            return (
              <Pressable
                key={p.key}
                style={[styles.pill, isActive && styles.activePill]}
                onPress={() => setPeriod(p.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Typography
                  variant="caption"
                  style={[styles.pillText, isActive && styles.activePillText]}
                >
                  {p.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Breakdown Items */}
      <View style={styles.breakdownContainer}>
        {/* Membership */}
        <View style={styles.categoryRow}>
          <View style={styles.labelRow}>
            <Typography variant="bodySmall" style={styles.catName}>
              Membership
            </Typography>
            <Typography variant="bodySmallBold" style={styles.catAmount}>
              ₹{currentData.membership.toLocaleString()}
            </Typography>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${membershipPct}%`, backgroundColor: BrandColors.teal }]} />
          </View>
        </View>

        {/* Add-ons */}
        <View style={styles.categoryRow}>
          <View style={styles.labelRow}>
            <Typography variant="bodySmall" style={styles.catName}>
              Add-ons
            </Typography>
            <Typography variant="bodySmallBold" style={styles.catAmount}>
              ₹{currentData.addons.toLocaleString()}
            </Typography>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${addonsPct}%`, backgroundColor: '#3B82F6' }]} />
          </View>
        </View>

        {/* POS Sales */}
        <View style={styles.categoryRow}>
          <View style={styles.labelRow}>
            <Typography variant="bodySmall" style={styles.catName}>
              POS Sales
            </Typography>
            <Typography variant="bodySmallBold" style={styles.catAmount}>
              ₹{currentData.pos.toLocaleString()}
            </Typography>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${posPct}%`, backgroundColor: '#8B5CF6' }]} />
          </View>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  title: {
    fontSize: 14,
    color: BrandColors.textSecondary,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: Radius.full,
    padding: 3,
    gap: 2,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  activePill: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pillText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  activePillText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
  breakdownContainer: {
    gap: Spacing.three,
  },
  categoryRow: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catName: {
    fontSize: 13,
    color: BrandColors.textPrimary,
  },
  catAmount: {
    fontSize: 13,
    color: BrandColors.textPrimary,
  },
  track: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
