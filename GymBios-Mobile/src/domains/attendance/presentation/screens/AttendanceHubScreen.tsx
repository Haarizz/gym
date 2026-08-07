import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BottomTabInset, BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { useAttendanceStats } from '../../hooks/useAttendance';
import {
  ActiveNowBanner,
  AttendanceSummaryCard,
  AttendanceSkeleton,
  HubFeatureCard,
  SimpleBarChart,
  formatAvgDuration,
} from '../components';

interface AttendanceHubScreenProps {
  onNavigateToToday: () => void;
  onNavigateToStaff: () => void;
  onNavigateToTrends: () => void;
  onNavigateToReports: () => void;
}

/**
 * Attendance Hub — mobile-first entry point for the Attendance module.
 *
 * Replaces the web frontend's tabbed layout with a scrollable hub that
 * surfaces the most important data first (active-now banner, summary
 * stats, weekly trend preview) and uses feature cards for deep navigation.
 */
export function AttendanceHubScreen({
  onNavigateToToday,
  onNavigateToStaff,
  onNavigateToTrends,
  onNavigateToReports,
}: AttendanceHubScreenProps) {
  const { stats, loading, error, refresh } = useAttendanceStats();

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading && !stats) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Attendance"
          subtitle="Track member & staff attendance"
          colors={[BrandColors.teal, BrandColors.tealDark]}
        />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <AttendanceSkeleton variant="overview" count={4} />
        </ScrollView>
      </ScreenLayout>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Attendance"
          subtitle="Track member & staff attendance"
          colors={[BrandColors.teal, BrandColors.tealDark]}
        />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor={BrandColors.teal}
            />
          }
        >
          <View style={styles.errorContainer}>
            <Feather name="alert-triangle" size={32} color="#b91c1c" />
            <Typography variant="bodySmallBold" style={styles.errorTitle}>
              Failed to load attendance data
            </Typography>
            <Typography variant="bodySmall" color="textSecondary">
              {error.message}
            </Typography>
          </View>
        </ScrollView>
      </ScreenLayout>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const todayVisits = stats?.todayVisits ?? 0;
  const activeNow = stats?.activeNow ?? 0;
  const avgDuration = formatAvgDuration(stats?.avgDurationMinutes);
  const peakHour = stats?.peakHour || '—';
  const attendanceRate = `${stats?.attendanceRate ?? 0}%`;
  const totalActiveMembers = stats?.totalActiveMembers ?? 0;

  const weeklyTrend = (stats?.weeklyTrend ?? []).map((p) => ({
    label: p.day,
    value: p.visits,
  }));

  const weeklyTotal = weeklyTrend.reduce((sum, p) => sum + p.value, 0);

  // Busiest / quietest day from weekly trend
  const busiestDay = weeklyTrend.reduce(
    (a, b) => (b.value > a.value ? b : a),
    { label: '—', value: 0 },
  );
  const quietestDay = weeklyTrend.reduce(
    (a, b) => (b.value < a.value ? b : a),
    { label: '—', value: Infinity },
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScreenLayout>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
      >
        {/* ── Active Now Banner ── */}
        <ActiveNowBanner activeCount={activeNow} todayVisits={todayVisits} />

        {/* ── Summary Stat Cards ── */}
        <View style={styles.statsGrid}>
          <AttendanceSummaryCard
            label="Today's Visits"
            value={String(todayVisits)}
            subtitle={`${activeNow} currently active`}
            iconName="user-check"
            iconBg={BrandColors.teal}
          />
          <AttendanceSummaryCard
            label="Avg Duration"
            value={avgDuration}
            subtitle="Per visit today"
            iconName="clock"
            iconBg="#10b981"
          />
          <AttendanceSummaryCard
            label="Peak Hour"
            value={peakHour}
            subtitle="Busiest time today"
            iconName="trending-up"
            iconBg="#f59e0b"
          />
          <AttendanceSummaryCard
            label="Attendance Rate"
            value={attendanceRate}
            subtitle="Of active members"
            iconName="users"
            iconBg="#8b5cf6"
          />
        </View>

        {/* ── Weekly Trend Preview ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Typography variant="bodySmallBold" style={styles.cardTitle}>
              Weekly Trend
            </Typography>
            <View style={styles.cardHeaderRight}>
              <Typography variant="caption" color="textSecondary">
                {weeklyTotal} visits this week
              </Typography>
              <Feather name="arrow-right" size={14} color={BrandColors.teal} />
            </View>
          </View>

          {weeklyTrend.length > 0 ? (
            <SimpleBarChart data={weeklyTrend} height={140} />
          ) : (
            <Typography variant="caption" color="textSecondary">
              No trend data available
            </Typography>
          )}

          <View style={styles.trendInsights}>
            <View style={styles.trendInsight}>
              <Typography variant="caption" color="textSecondary">
                Busiest
              </Typography>
              <Typography variant="bodySmallBold">
                {busiestDay.label} ({busiestDay.value})
              </Typography>
            </View>
            <View style={styles.trendInsight}>
              <Typography variant="caption" color="textSecondary">
                Quietest
              </Typography>
              <Typography variant="bodySmallBold">
                {quietestDay.label} ({quietestDay.value})
              </Typography>
            </View>
          </View>
        </View>

        {/* ── Feature Cards ── */}
        <View style={styles.featureCards}>
          <HubFeatureCard
            title="Today's Attendance"
            subtitle="Active check-ins & manual checkout"
            iconName="clipboard"
            iconBg="#e0f2fe"
            iconColor="#0284c7"
            onPress={onNavigateToToday}
            countLabel={`${todayVisits} visits`}
          />

          <HubFeatureCard
            title="Staff & Trainers"
            subtitle="Clock-in / clock-out records"
            iconName="briefcase"
            iconBg="#fef3c7"
            iconColor="#d97706"
            onPress={onNavigateToStaff}
          />

          <HubFeatureCard
            title="Weekly Trends"
            subtitle="Visit patterns & insights"
            iconName="bar-chart-2"
            iconBg="#dcfce7"
            iconColor="#15803d"
            onPress={onNavigateToTrends}
          />

          <HubFeatureCard
            title="Reports"
            subtitle="Detailed analytics & exports"
            iconName="file-text"
            iconBg="#ede9fe"
            iconColor="#7c3aed"
            onPress={onNavigateToReports}
          />
        </View>

        {/* ── Quick Stats ── */}
        <View style={styles.quickStatsCard}>
          <Typography variant="bodySmallBold" style={styles.quickStatsTitle}>
            Quick Stats
          </Typography>
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStat}>
              <Typography variant="caption" color="textSecondary">
                Active Members
              </Typography>
              <Typography variant="bodySmallBold" style={styles.quickStatValue}>
                {totalActiveMembers}
              </Typography>
            </View>
            <View style={styles.quickStat}>
              <Typography variant="caption" color="textSecondary">
                Peak Hour
              </Typography>
              <Typography variant="bodySmallBold" style={styles.quickStatValue}>
                {peakHour}
              </Typography>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    backgroundColor: BrandColors.white,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendInsights: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  trendInsight: {
    flex: 1,
    gap: 2,
  },
  featureCards: {
    gap: Spacing.two,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  errorTitle: {
    textAlign: 'center',
    color: '#b91c1c',
  },
  quickStatsCard: {
    backgroundColor: BrandColors.white,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickStatsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  quickStat: {
    flex: 1,
    gap: 2,
  },
  quickStatValue: {
    fontSize: 16,
    color: BrandColors.teal,
  },
});
