import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { BarChart, ChartContainer, Surface, Typography } from '@/shared/components';
import type { TrainerPerformanceItem } from '../../../domain/communityAdvancedAnalyticsData.types';

interface TrainerPerformanceProps {
  trainerData?: TrainerPerformanceItem[];
}

export function TrainerPerformance({ trainerData = [] }: TrainerPerformanceProps) {
  const chartData = trainerData.map((t: TrainerPerformanceItem) => ({
    x: t.name,
    Revenue: t.revenue,
  }));

  const isEmpty = trainerData.length === 0;

  return (
    <View style={styles.container}>
      <ChartContainer
        title="Trainer Revenue Comparison"
        description="Total revenue generated per trainer"
        empty={isEmpty}
        emptyTitle="No trainer performance data"
        emptyDescription="Class bookings will populate trainer metrics."
        height={220}
      >
        <BarChart
          data={chartData}
          xKey="x"
          series={[
            {
              key: 'Revenue',
              label: 'Revenue',
              color: BrandColors.teal,
            },
          ]}
          height={180}
          yAxisFormatter={(val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
        />
      </ChartContainer>

      {/* Trainer Breakdown List */}
      <Surface background="backgroundElement" style={styles.card}>
        <Typography variant="bodySmallBold" style={styles.title}>
          Trainer Performance Breakdown
        </Typography>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <Typography variant="caption" color="textSecondary">
              No trainer breakdown available.
            </Typography>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {trainerData.map((trainer, idx) => (
              <View key={`${trainer.name}-${idx}`} style={styles.trainerRow}>
                <View style={styles.trainerInfo}>
                  <Typography variant="bodySmallBold" style={styles.trainerName}>
                    {trainer.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {trainer.classes} classes • {trainer.attendance}% attendance
                  </Typography>
                </View>

                <View style={styles.revenueContainer}>
                  <Typography variant="bodySmallBold" style={styles.revenueText}>
                    ₹{trainer.revenue.toLocaleString()}
                  </Typography>
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
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  listContainer: {
    gap: Spacing.two,
  },
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  revenueContainer: {
    alignItems: 'flex-end',
  },
  revenueText: {
    fontSize: 14,
    color: BrandColors.teal,
  },
});
