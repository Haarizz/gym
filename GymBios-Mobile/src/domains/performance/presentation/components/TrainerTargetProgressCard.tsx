import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { MonthlyPerformanceDTO } from '../../domain/TrainerPerformanceData';

interface TrainerTargetProgressCardProps {
  monthlyPerformance: MonthlyPerformanceDTO;
}

export function TrainerTargetProgressCard({ monthlyPerformance }: TrainerTargetProgressCardProps) {
  const { revenue, sessions } = monthlyPerformance;

  return (
    <LinearGradient
      colors={[BrandColors.trainerAmber, '#D97706']}
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
            ₹{(revenue.achieved / 1000).toFixed(0)}K / ₹{(revenue.target / 1000).toFixed(0)}K
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${revenue.percentage}%` }]} />
        </View>
        <Text style={styles.percentageAchieved}>{revenue.percentage}% achieved</Text>
      </View>

      {/* Sessions Target */}
      <View style={styles.targetSection}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetLabel}>Session Target</Text>
          <Text style={styles.targetValues}>
            {sessions.completed} / {sessions.target}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${sessions.percentage}%` }]} />
        </View>
        <Text style={styles.percentageAchieved}>{sessions.percentage}% achieved</Text>
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
