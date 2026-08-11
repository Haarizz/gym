import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Surface, Typography } from '@/shared/components';
import type { ChurnPredictionItem } from '../../../domain/communityAdvancedAnalyticsData.types';

interface ChurnPredictionProps {
  churnData?: ChurnPredictionItem[];
}

export function ChurnPrediction({ churnData = [] }: ChurnPredictionProps) {
  const highRisk = churnData.filter(c => c.risk === 'High');
  const mediumRisk = churnData.filter(c => c.risk === 'Medium');
  const lowRisk = churnData.filter(c => c.risk === 'Low');

  const isEmpty = churnData.length === 0;

  return (
    <View style={styles.container}>
      {/* Risk Summary Cards */}
      <View style={styles.summaryRow}>
        <Surface background="backgroundElement" style={styles.summaryCard}>
          <Typography variant="subtitle" style={styles.highVal}>
            {highRisk.length}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            High Risk
          </Typography>
        </Surface>

        <Surface background="backgroundElement" style={styles.summaryCard}>
          <Typography variant="subtitle" style={styles.medVal}>
            {mediumRisk.length}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Medium Risk
          </Typography>
        </Surface>

        <Surface background="backgroundElement" style={styles.summaryCard}>
          <Typography variant="subtitle" style={styles.lowVal}>
            {lowRisk.length}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Low Risk
          </Typography>
        </Surface>
      </View>

      {/* Member Churn List */}
      <Surface background="backgroundElement" style={styles.listCard}>
        <Typography variant="bodySmallBold" style={styles.title}>
          Members at Risk of Churn
        </Typography>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <Typography variant="caption" color="textSecondary">
              No members currently flagged for churn risk.
            </Typography>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {churnData.map((item, idx) => (
              <View key={`${item.name}-${idx}`} style={styles.memberRow}>
                <View style={styles.memberInfo}>
                  <Typography variant="bodySmallBold" style={styles.memberName}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {item.membership} • Last visit: {item.lastVisit}
                  </Typography>
                </View>

                <View style={styles.riskRight}>
                  <View
                    style={[
                      styles.riskBadge,
                      item.risk === 'High'
                        ? styles.highBadge
                        : item.risk === 'Medium'
                        ? styles.medBadge
                        : styles.lowBadge,
                    ]}
                  >
                    <Typography
                      variant="caption"
                      style={[
                        styles.riskText,
                        item.risk === 'High'
                          ? styles.highText
                          : item.risk === 'Medium'
                          ? styles.medText
                          : styles.lowText,
                      ]}
                    >
                      {item.risk} ({item.probability}%)
                    </Typography>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  highVal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EF4444',
  },
  medVal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
  },
  lowVal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  listCard: {
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
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  listContainer: {
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  riskRight: {
    alignItems: 'flex-end',
  },
  riskBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  highBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  medBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  lowBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  riskText: {
    fontSize: 12,
    fontWeight: '700',
  },
  highText: {
    color: '#EF4444',
  },
  medText: {
    color: '#F59E0B',
  },
  lowText: {
    color: '#10B981',
  },
});
