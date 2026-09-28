import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { formatCompactCurrency } from '@/domains/dashboard/utils/adminDashboardFormat';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import type { Staff } from '../../domain/Staff';
import type { StaffPerformance, StaffPerformanceStatus } from '../../domain/StaffOverview';

interface StaffCardProps {
  staff: Staff;
  /** Undefined while the performance snapshot is still loading. */
  performance?: StaffPerformance;
  currencyCode: string;
  onPress?: (staff: Staff) => void;
  onMessage?: (staff: Staff) => void;
}

const STATUS_STYLES: Record<StaffPerformanceStatus | 'INACTIVE', { label: string; color: string }> = {
  EXCELLENT: { label: 'Excellent', color: '#16a34a' },
  ON_TRACK: { label: 'On Track', color: '#2563eb' },
  AT_RISK: { label: 'At Risk', color: '#ea580c' },
  NO_TARGET: { label: 'No Target', color: '#6b7280' },
  INACTIVE: { label: 'Inactive', color: '#6b7280' },
};

export const StaffCard = memo(function StaffCard({
  staff,
  performance,
  currencyCode,
  onPress,
  onMessage,
}: StaffCardProps) {
  const theme = useTheme();

  const initials = staff.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isActive = staff.status?.toUpperCase() === 'ACTIVE';
  const badgeKey = !isActive ? 'INACTIVE' : performance?.performanceStatus;
  const badge = badgeKey ? STATUS_STYLES[badgeKey] : undefined;

  const target = performance?.revenueTarget || staff.monthlyTarget;
  const achievedText = performance
    ? formatCompactCurrency(performance.revenueAchieved, currencyCode)
    : '—';
  const targetText = target > 0 ? formatCompactCurrency(target, currencyCode) : 'No target';

  return (
    <Pressable onPress={() => onPress?.(staff)}>
      <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userRow}>
            <Avatar
              initials={initials}
              imageUrl={staff.photoUrl}
              size={48}
              backgroundColor={BrandColors.teal}
              textColor={BrandColors.white}
            />
            <View style={styles.info}>
              <Typography variant="bodySmallBold" numberOfLines={1}>
                {staff.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" numberOfLines={1}>
                {staff.role}{staff.branch ? ` · ${staff.branch}` : ''}
              </Typography>
            </View>
          </View>
          {badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: `${badge.color}1A`, borderColor: `${badge.color}40` },
              ]}
            >
              <Typography variant="caption" style={[styles.badgeLabel, { color: badge.color }]}>
                {badge.label.toUpperCase()}
              </Typography>
            </View>
          ) : null}
        </View>

        {/* Performance metrics */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricTile, { backgroundColor: theme.backgroundSelected }]}>
            <View style={styles.metricLabelRow}>
              <Feather name="target" size={12} color={theme.textSecondary} />
              <Typography variant="caption" color="textSecondary" style={styles.metricLabel}>
                Target Achievement
              </Typography>
            </View>
            <Typography variant="bodySmallBold" numberOfLines={1}>
              {achievedText} / {targetText}
            </Typography>
          </View>
          <View style={[styles.metricTile, { backgroundColor: theme.backgroundSelected }]}>
            <View style={styles.metricLabelRow}>
              <Feather name="trending-up" size={12} color={theme.textSecondary} />
              <Typography variant="caption" color="textSecondary" style={styles.metricLabel}>
                Conversion
              </Typography>
            </View>
            <Typography variant="bodySmallBold">
              {performance ? `${performance.conversionRate}%` : '—'}
            </Typography>
          </View>
        </View>

        {/* Additional stats */}
        <View style={[styles.statsRow, { borderBottomColor: theme.border }]}>
          <View style={styles.stat}>
            <Feather name="calendar" size={12} color={theme.textSecondary} />
            <Typography variant="caption" color="textSecondary">
              PT: {performance ? performance.ptSessions : '—'}
            </Typography>
          </View>
          <View style={styles.stat}>
            <Feather name="user-check" size={12} color={theme.textSecondary} />
            <Typography variant="caption" color="textSecondary">
              Attendance: {performance ? `${performance.attendanceRate}%` : '—'}
            </Typography>
          </View>
          <View style={styles.stat}>
            <Feather name="star" size={12} color="#EAB308" />
            <Typography variant="caption" style={styles.ratingValue}>
              {performance && performance.ratingCount > 0 ? performance.rating.toFixed(1) : '—'}
            </Typography>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryAction,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
            onPress={() => onPress?.(staff)}
            accessibilityRole="button"
          >
            <Typography variant="bodySmallBold" style={{ color: theme.primaryText }}>
              View Details
            </Typography>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryAction,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}
            onPress={() => onMessage?.(staff)}
            accessibilityRole="button"
            accessibilityLabel={`Message ${staff.name}`}
          >
            <Feather name="message-circle" size={16} color={theme.text} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    paddingRight: Spacing.two,
  },
  info: {
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metricTile: {
    flex: 1,
    borderRadius: Radius.sm,
    padding: Spacing.two,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  metricLabel: {
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  ratingValue: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  primaryAction: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
