import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { GlassSurface } from '@/shared/components';
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
  const metrics = summary ? buildMetrics(summary) : null;
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

      {/* Three Summary Metrics — hidden for admins, who have no personal stats */}
      {metrics && (
        <GlassSurface radius={Radius.lg} style={styles.metricsContainer}>
          {metrics.map((metric, index) => (
            <Fragment key={metric.label}>
              {index > 0 && <View style={styles.metricDivider} />}
              <View style={styles.metricBox}>
                <Typography variant="caption" style={styles.metricLabel}>
                  {metric.label}
                </Typography>
                <Typography variant="subtitle" style={[styles.metricValue, { color: metric.color }]}>
                  {metric.value}
                </Typography>
              </View>
            </Fragment>
          ))}
        </GlassSurface>
      )}
    </View>
  );
}

interface SummaryMetric {
  label: string;
  value: string;
  color: string;
}

const GREEN = '#16a34a';
const BLUE = '#2563eb';

const percentOrDash = (value: number | null) => (value == null ? '—' : `${value}%`);

function buildMetrics(summary: ProfileSummary): SummaryMetric[] {
  if (summary.kind === 'member') {
    const daysLeft = summary.membershipDaysLeft;
    return [
      { label: 'Visits', value: `${summary.totalVisits}`, color: GREEN },
      { label: 'Streak', value: `${summary.streakDays} ${summary.streakDays === 1 ? 'day' : 'days'}`, color: BrandColors.teal },
      { label: 'Plan Days Left', value: daysLeft == null ? '—' : `${daysLeft}`, color: BLUE },
    ];
  }
  return [
    { label: 'Performance', value: percentOrDash(summary.performanceScore), color: GREEN },
    {
      label: 'Targets',
      value: summary.targetTotal > 0 ? `${summary.targetAchieved}/${summary.targetTotal}` : '—',
      color: BrandColors.teal,
    },
    { label: 'Attendance', value: percentOrDash(summary.attendanceRate), color: BLUE },
  ];
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
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: BrandColors.teal,
    borderWidth: 2,
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
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
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
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(30,42,58,0.1)',
  },
});
