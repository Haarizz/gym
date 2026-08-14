import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Surface, Typography } from '@/shared/components';
import type { StaffPerformanceItem } from '../../domain/communityAnalyticsData.types';

interface CommunityStaffPerformanceProps {
  staffData?: StaffPerformanceItem[];
}

export function CommunityStaffPerformance({ staffData = [] }: CommunityStaffPerformanceProps) {
  const isEmpty = staffData.length === 0;

  return (
    <Surface background="backgroundElement" style={styles.card}>
      <Typography variant="bodySmallBold" style={styles.title}>
        Staff Performance
      </Typography>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Typography variant="caption" color="textSecondary">
            No staff sales targets recorded for this period.
          </Typography>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {staffData.map((item, index) => {
            const isTop = index === 0;
            return (
              <View key={`${item.name}-${index}`} style={styles.row}>
                <View style={[styles.rankBadge, isTop && styles.topRankBadge]}>
                  <Typography
                    variant="caption"
                    style={[styles.rankText, isTop && styles.topRankText]}
                  >
                    {index + 1}
                  </Typography>
                </View>

                <View style={styles.nameContainer}>
                  <Typography variant="bodySmallBold" style={styles.staffName}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    ₹{item.sales.toLocaleString()}
                    {item.target > 0 ? ` / ₹${item.target.toLocaleString()}` : ''}
                  </Typography>
                </View>

                <View
                  style={[
                    styles.achievementBadge,
                    item.achievement >= 100
                      ? styles.successBadge
                      : item.achievement >= 50
                      ? styles.infoBadge
                      : styles.neutralBadge,
                  ]}
                >
                  <Typography
                    variant="caption"
                    style={[
                      styles.achievementText,
                      item.achievement >= 100
                        ? styles.successText
                        : item.achievement >= 50
                        ? styles.infoText
                        : styles.neutralText,
                    ]}
                  >
                    {item.achievement.toFixed(0)}%
                  </Typography>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 15,
    color: BrandColors.textPrimary,
  },
  emptyContainer: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  listContainer: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: Spacing.three,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRankBadge: {
    backgroundColor: 'rgba(50, 127, 116, 0.15)',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.textSecondary,
  },
  topRankText: {
    color: BrandColors.teal,
  },
  nameContainer: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  achievementBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  successBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  infoBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  neutralBadge: {
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
  },
  achievementText: {
    fontSize: 12,
    fontWeight: '700',
  },
  successText: {
    color: '#10B981',
  },
  infoText: {
    color: '#3B82F6',
  },
  neutralText: {
    color: '#64748B',
  },
});
