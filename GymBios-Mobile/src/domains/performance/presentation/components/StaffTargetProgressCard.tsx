import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { PerformanceTargets } from '../../domain/StaffPerformanceData';

interface StaffTargetProgressCardProps {
  targets: PerformanceTargets;
}

export function StaffTargetProgressCard({ targets }: StaffTargetProgressCardProps) {
  const convPct = Math.min(
    Math.round((targets.conversionsAchieved / targets.conversionsTarget) * 100),
    100
  );

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
            ₹{(targets.achieved / 1000).toFixed(0)}K / ₹{(targets.monthlyTarget / 1000).toFixed(0)}K
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${targets.percentage}%` }]} />
        </View>
        <Text style={styles.percentageAchieved}>{targets.percentage}% achieved</Text>
      </View>

      {/* Conversions Target */}
      <View style={styles.targetSection}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetLabel}>Conversions Target</Text>
          <Text style={styles.targetValues}>
            {targets.conversionsAchieved} / {targets.conversionsTarget}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${convPct}%` }]} />
        </View>
        <Text style={styles.percentageAchieved}>{convPct}% achieved</Text>
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
