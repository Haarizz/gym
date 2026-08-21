import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing, TypographyScale } from '@/core/theme';

export interface TrainerProgressData {
  sessionsCompleted: number;
  currentGoal: string;
  startWeight: string;
  currentWeight: string;
  targetWeight: string;
}

interface TrainerProgressCardProps {
  progress: TrainerProgressData;
}

export function TrainerProgressCard({ progress }: TrainerProgressCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>My Progress</Text>
        <Feather name="award" size={20} color={BrandColors.memberGold} />
      </View>

      {/* Current Goal Banner */}
      <View style={styles.goalBanner}>
        <Text style={styles.goalLabel}>Current Goal</Text>
        <Text style={styles.goalValue}>{progress.currentGoal}</Text>
      </View>

      {/* Weight Progress 3-Col */}
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Start</Text>
          <Text style={styles.statValuePrimary}>{progress.startWeight}</Text>
        </View>

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={[styles.statValuePrimary, { color: BrandColors.memberGold }]}>
            {progress.currentWeight}
          </Text>
        </View>

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Target</Text>
          <Text style={[styles.statValuePrimary, { color: BrandColors.teal }]}>
            {progress.targetWeight}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Sessions completed count */}
      <View style={styles.footerRow}>
        <Text style={styles.footerLabel}>Sessions Completed</Text>
        <Text style={styles.footerValue}>{progress.sessionsCompleted}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: TypographyScale.subtitle,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  goalBanner: {
    backgroundColor: '#F0FDFA',
    borderRadius: Radius.md,
    padding: Spacing.three,
    borderLeftWidth: 4,
    borderColor: BrandColors.teal,
  },
  goalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
  },
  goalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.one,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: BrandColors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValuePrimary: {
    fontSize: 17,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    fontWeight: '500',
  },
  footerValue: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.textPrimary,
  },
});
