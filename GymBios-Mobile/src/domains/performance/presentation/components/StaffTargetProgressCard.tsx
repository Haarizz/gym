import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CurrencyValue } from '@/core/providers';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { PerformanceTargets } from '../../domain/StaffPerformanceData';

interface StaffTargetProgressCardProps {
  targets: PerformanceTargets;
}

export function StaffTargetProgressCard({ targets }: StaffTargetProgressCardProps) {
  // No target set for the month (e.g. "New Clients Target" left blank on the web) — show the
  // count on its own instead of dividing by zero, which read as "1 / 0 · 100% achieved".
  const hasConversionsTarget = targets.conversionsTarget > 0;
  const convPct = hasConversionsTarget
    ? Math.min(Math.round((targets.conversionsAchieved / targets.conversionsTarget) * 100), 100)
    : 0;
  const hasRevenueTarget = targets.monthlyTarget > 0;
  const revenueBarPct = Math.min(Math.max(targets.percentage, 0), 100);

  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Monthly Performance</Text>

      {/* Revenue Target */}
      <View style={styles.targetSection}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetLabel}>Revenue Target</Text>
          <Text style={styles.targetValues}>
            <CurrencyValue amount={targets.achieved} compact /> / <CurrencyValue amount={targets.monthlyTarget} compact />
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${revenueBarPct}%` }]} />
        </View>
        <Text style={styles.percentageAchieved}>
          {hasRevenueTarget ? `${targets.percentage}% achieved` : 'No target set'}
        </Text>
      </View>

      {/* Conversions Target */}
      <View style={styles.targetSection}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetLabel}>Conversions Target</Text>
          <Text style={styles.targetValues}>
            {hasConversionsTarget
              ? `${targets.conversionsAchieved} / ${targets.conversionsTarget}`
              : targets.conversionsAchieved}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${convPct}%` }]} />
        </View>
        <Text style={styles.percentageAchieved}>
          {hasConversionsTarget ? `${convPct}% achieved` : 'No target set'}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.three,
  },
  targetSection: {
    marginBottom: Spacing.three,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  targetLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  targetValues: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.full,
  },
  percentageAchieved: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
    marginTop: 4,
  },
});
