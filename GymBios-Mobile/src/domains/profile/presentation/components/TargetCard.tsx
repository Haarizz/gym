import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import type { UserTarget } from '../../domain';

interface TargetCardProps {
  target: UserTarget;
}

export function TargetCard({ target }: TargetCardProps) {
  const percentage = Math.min(100, Math.round((target.progress / target.target) * 100));

  const isCompleted = target.status === 'completed';
  const isOverdue = target.status === 'overdue';

  const statusBg = isCompleted ? '#dcfce7' : isOverdue ? '#fee2e2' : '#e0f2fe';
  const statusColor = isCompleted ? '#166534' : isOverdue ? '#991b1b' : '#0369a1';
  const progressBarColor = isCompleted ? '#16a34a' : isOverdue ? '#dc2626' : BrandColors.teal;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconAndTitle}>
          <View style={styles.iconBadge}>
            <Feather name="target" size={18} color="#ffffff" />
          </View>
          <View style={styles.titleWrapper}>
            <Typography variant="subtitle" style={styles.title}>
              {target.title}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {target.category}
            </Typography>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Typography variant="caption" style={[styles.statusText, { color: statusColor }]}>
            {target.status.toUpperCase()}
          </Typography>
        </View>
      </View>

      <Typography variant="bodySmall" color="textSecondary" style={styles.description}>
        {target.description}
      </Typography>

      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Typography variant="bodySmall" style={styles.progressText}>
            Progress: {target.progress} / {target.target} {target.unit}
          </Typography>
          <Typography variant="bodySmall" style={[styles.percentageText, { color: progressBarColor }]}>
            {percentage}%
          </Typography>
        </View>

        {/* Progress Bar */}
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: progressBarColor }]} />
        </View>

        <View style={styles.footer}>
          <Feather name="calendar" size={13} color="#64748b" style={styles.calendarIcon} />
          <Typography variant="caption" color="textSecondary">
            Deadline: {target.deadline}
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  iconAndTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.two,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  description: {
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  progressSection: {
    gap: Spacing.one,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '500',
    color: BrandColors.textPrimary,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginRight: 4,
  },
});
