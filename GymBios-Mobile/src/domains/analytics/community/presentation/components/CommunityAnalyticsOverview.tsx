import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Surface, Typography } from '@/shared/components';
import type {
  CollectionsData,
  RetentionFunnelStage,
  TargetProgressData,
} from '../../domain/communityAnalyticsData.types';

interface CommunityAnalyticsOverviewProps {
  targets?: TargetProgressData;
  collections?: CollectionsData;
  retentionFunnel?: RetentionFunnelStage[];
}

export function CommunityAnalyticsOverview({
  targets,
  collections,
  retentionFunnel = [],
}: CommunityAnalyticsOverviewProps) {
  const activeMembers =
    retentionFunnel.find(f => f.name.toLowerCase().includes('active'))?.value ?? 0;
  const renewals =
    retentionFunnel.find(f => f.name.toLowerCase().includes('renewal'))?.value ?? 0;

  const monthTotal = collections?.thisMonth?.total ?? 0;
  const targetProgress = targets?.progress ?? 0;

  return (
    <View style={styles.gridContainer}>
      <View style={styles.row}>
        {/* Target Progress */}
        <Surface background="backgroundElement" style={styles.kpiCard}>
          <View style={styles.headerRow}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(50, 127, 116, 0.12)' }]}>
              <Feather name="target" size={18} color={BrandColors.teal} />
            </View>
            <View style={styles.progressBadge}>
              <Typography variant="caption" style={styles.badgeText}>
                {targetProgress.toFixed(0)}%
              </Typography>
            </View>
          </View>
          <Typography variant="caption" color="textSecondary" style={styles.label}>
            Target Progress
          </Typography>
          <Typography variant="subtitle" style={styles.value}>
            ₹{(targets?.achieved ?? 0).toLocaleString()}
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.subtext}>
            Target: ₹{(targets?.assigned ?? 0).toLocaleString()}
          </Typography>
        </Surface>

        {/* Total Collections */}
        <Surface background="backgroundElement" style={styles.kpiCard}>
          <View style={styles.headerRow}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Feather name="dollar-sign" size={18} color="#3B82F6" />
            </View>
          </View>
          <Typography variant="caption" color="textSecondary" style={styles.label}>
            Total Collections
          </Typography>
          <Typography variant="subtitle" style={styles.value}>
            ₹{monthTotal.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.subtext}>
            This Month
          </Typography>
        </Surface>
      </View>

      <View style={styles.row}>
        {/* Active Members */}
        <Surface background="backgroundElement" style={styles.kpiCard}>
          <View style={styles.headerRow}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Feather name="users" size={18} color="#10B981" />
            </View>
          </View>
          <Typography variant="caption" color="textSecondary" style={styles.label}>
            Active Members
          </Typography>
          <Typography variant="subtitle" style={styles.value}>
            {activeMembers.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.subtext}>
            Total Active
          </Typography>
        </Surface>

        {/* Member Retention */}
        <Surface background="backgroundElement" style={styles.kpiCard}>
          <View style={styles.headerRow}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
              <Feather name="user-check" size={18} color="#8B5CF6" />
            </View>
          </View>
          <Typography variant="caption" color="textSecondary" style={styles.label}>
            Member Retention
          </Typography>
          <Typography variant="subtitle" style={styles.value}>
            {renewals} Renewals
          </Typography>
          <Typography variant="caption" color="textSecondary" style={styles.subtext}>
            This Month
          </Typography>
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  kpiCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadge: {
    backgroundColor: 'rgba(50, 127, 116, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    color: BrandColors.teal,
    fontWeight: '700',
    fontSize: 11,
  },
  label: {
    fontSize: 12,
    marginTop: 2,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  subtext: {
    fontSize: 11,
    marginTop: 2,
  },
});
