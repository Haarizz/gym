import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import type { Profile, ProfileSummary } from '../../domain';

interface ProfileSummaryCardProps {
  profile?: Profile;
  summary?: ProfileSummary;
  initials: string;
  firstName: string;
  onEditPhoto?: () => void;
}

export function ProfileSummaryCard({
  profile,
  summary,
  initials,
  firstName,
  onEditPhoto,
}: ProfileSummaryCardProps) {
  const performanceScore = summary?.performanceScore ?? 94;
  const targetsCompleted = summary?.completedTargets ?? 24;
  const totalTargets = summary?.totalTargets ?? 32;
  const attendanceRate = summary?.attendanceRate ?? 98;

  const roleDisplay = profile?.role ? profile.role.toUpperCase() : 'MEMBER';

  return (
    <View style={styles.container}>
      {/* Avatar Section with Camera Affordance */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          <Avatar
            initials={initials}
            imageUrl={profile?.photoUrl}
            size={88}
            backgroundColor={BrandColors.teal}
          />
          {onEditPhoto && (
            <Pressable
              hitSlop={8}
              style={({ pressed }) => [styles.cameraButton, pressed && styles.cameraButtonPressed]}
              onPress={onEditPhoto}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              <Feather name="camera" size={15} color="#ffffff" />
            </Pressable>
          )}
        </View>

        <Typography variant="title" style={styles.greeting}>
          Hello, {firstName}
        </Typography>

        <View style={styles.badge}>
          <Typography variant="caption" style={styles.badgeText}>
            {roleDisplay}
          </Typography>
        </View>
      </View>

      {/* Three Summary Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricBox}>
          <Typography variant="caption" style={styles.metricLabel}>
            Performance
          </Typography>
          <Typography variant="subtitle" style={[styles.metricValue, styles.performanceValue]}>
            {performanceScore}%
          </Typography>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBox}>
          <Typography variant="caption" style={styles.metricLabel}>
            Targets
          </Typography>
          <Typography variant="subtitle" style={[styles.metricValue, styles.targetsValue]}>
            {targetsCompleted}/{totalTargets}
          </Typography>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBox}>
          <Typography variant="caption" style={styles.metricLabel}>
            Attendance
          </Typography>
          <Typography variant="subtitle" style={[styles.metricValue, styles.attendanceValue]}>
            {attendanceRate}%
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.two,
  },
  cameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BrandColors.teal,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cameraButtonPressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: BrandColors.tealDark,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: BrandColors.textPrimary,
    marginTop: Spacing.half,
  },
  badge: {
    marginTop: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: '#eef7f6',
  },
  badgeText: {
    color: BrandColors.teal,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: BrandColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  performanceValue: {
    color: '#16a34a',
  },
  targetsValue: {
    color: BrandColors.teal,
  },
  attendanceValue: {
    color: '#2563eb',
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
});
