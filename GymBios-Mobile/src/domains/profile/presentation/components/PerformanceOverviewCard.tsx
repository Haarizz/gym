import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { UserPerformance } from '../../domain';

interface PerformanceOverviewCardProps {
  performance: UserPerformance;
}

export function PerformanceOverviewCard({ performance }: PerformanceOverviewCardProps) {
  return (
    <View style={styles.container}>
      {/* 4 Overview Metric Cards */}
      <View style={styles.grid}>
        <View style={[styles.tile, styles.tealTile]}>
          <View style={styles.tileHeader}>
            <Typography variant="title" style={styles.tileNumber}>
              {performance.performanceScore}%
            </Typography>
            <Feather name="trending-up" size={20} color="rgba(255,255,255,0.85)" />
          </View>
          <Typography variant="caption" style={styles.tileLabel}>
            Performance Score
          </Typography>
        </View>

        <View style={[styles.tile, styles.tealDarkTile]}>
          <View style={styles.tileHeader}>
            <Typography variant="title" style={styles.tileNumber}>
              {performance.classesCompleted}
            </Typography>
            <Feather name="activity" size={20} color="rgba(255,255,255,0.85)" />
          </View>
          <Typography variant="caption" style={styles.tileLabel}>
            Classes Completed
          </Typography>
        </View>

        <View style={[styles.tile, styles.tealDarkTile]}>
          <View style={styles.tileHeader}>
            <Typography variant="title" style={styles.tileNumber}>
              {performance.hoursWorked}
            </Typography>
            <Feather name="clock" size={20} color="rgba(255,255,255,0.85)" />
          </View>
          <Typography variant="caption" style={styles.tileLabel}>
            Hours Worked
          </Typography>
        </View>

        <View style={[styles.tile, styles.tealTile]}>
          <View style={styles.tileHeader}>
            <Typography variant="title" style={styles.tileNumber}>
              {performance.clientSatisfaction}%
            </Typography>
            <Feather name="heart" size={20} color="rgba(255,255,255,0.85)" />
          </View>
          <Typography variant="caption" style={styles.tileLabel}>
            Client Satisfaction
          </Typography>
        </View>
      </View>

      {/* KPI Trends Section */}
      <View style={styles.kpiContainer}>
        <Typography variant="subtitle" style={styles.kpiHeader}>
          Key Performance Indicators
        </Typography>

        <View style={styles.kpiList}>
          {performance.kpis.map((kpi, index) => (
            <View key={index} style={styles.kpiCard}>
              <View style={styles.kpiValueRow}>
                <Feather name="arrow-up-right" size={18} color="#16a34a" />
                <Typography variant="subtitle" style={styles.kpiValue}>
                  {kpi.value}
                </Typography>
              </View>
              <Typography variant="bodySmall" style={styles.kpiLabel}>
                {kpi.label}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {kpi.subtitle}
              </Typography>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    width: '48.5%',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    justifyContent: 'space-between',
    minHeight: 90,
  },
  tealTile: {
    backgroundColor: BrandColors.teal,
  },
  tealDarkTile: {
    backgroundColor: BrandColors.tealDark,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileNumber: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  tileLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: Spacing.one,
  },
  kpiContainer: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  kpiHeader: {
    color: BrandColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  kpiList: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiValue: {
    color: '#16a34a',
    fontWeight: '800',
    fontSize: 16,
    marginLeft: 2,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: BrandColors.textPrimary,
    marginBottom: 2,
  },
});
