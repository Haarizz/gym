import { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BottomTabInset, BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';

import { useAttendanceStats } from '../../hooks/useAttendance';
import {
  AttendanceErrorState,
  AttendanceSkeleton,
  SimpleBarChart,
  TrendInsightCard,
  formatAvgDuration,
} from '../components';

interface WeeklyTrendsScreenProps {
  onBack?: () => void;
}

/**
 * Weekly Trends — attendance visit patterns for the current week,
 * with busiest/quietest day insights.
 *
 * Mobile adaptation of the web frontend's "Weekly Trends" tab:
 * uses the existing SimpleBarChart for the bar chart and
 * TrendInsightCard for the insight cards, laid out vertically
 * for easy scanning on a small screen.
 */
export function WeeklyTrendsScreen({ onBack }: WeeklyTrendsScreenProps) {
  const { stats, loading, error, refresh } = useAttendanceStats();

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading && !stats) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Weekly Trends"
          subtitle="Visit patterns & insights"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
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
          title="Weekly Trends"
          subtitle="Visit patterns & insights"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
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
          <AttendanceErrorState
            message={error.message}
            onRetry={handleRefresh}
          />
        </ScrollView>
      </ScreenLayout>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const weeklyTrend = (stats?.weeklyTrend ?? []).map((p) => ({
    label: p.day,
    value: p.visits,
  }));

  const weeklyTotal = weeklyTrend.reduce((sum, p) => sum + p.value, 0);

  const busiestDay = weeklyTrend.reduce(
    (a, b) => (b.value > a.value ? b : a),
    { label: '—', value: 0 },
  );

  const quietestDay = weeklyTrend.reduce(
    (a, b) => (b.value < a.value ? b : a),
    { label: '—', value: Infinity },
  );

  const avgDuration = formatAvgDuration(stats?.avgDurationMinutes);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScreenLayout>
      <AppHeader
        title="Weekly Trends"
        subtitle="Visit patterns & insights"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
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
        {/* ── Weekly Bar Chart ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Typography variant="bodySmallBold" style={styles.cardTitle}>
              Weekly Visits
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {weeklyTotal} total this week
            </Typography>
          </View>

          {weeklyTrend.length > 0 ? (
            <SimpleBarChart data={weeklyTrend} height={180} />
          ) : (
            <View style={styles.emptyChart}>
              <Typography variant="caption" color="textSecondary">
                No trend data available
              </Typography>
            </View>
          )}
        </View>

        {/* ── Insight Cards ── */}
        <View style={styles.insightsGrid}>
          <TrendInsightCard
            label="Busiest Day"
            value={busiestDay.label}
            subtitle={`${busiestDay.value} visits`}
          />
          <TrendInsightCard
            label="Quietest Day"
            value={quietestDay.label}
            subtitle={`${quietestDay.value === Infinity ? 0 : quietestDay.value} visits`}
          />
          <TrendInsightCard
            label="Avg Duration"
            value={avgDuration}
            subtitle="Per visit"
          />
          <TrendInsightCard
            label="Peak Hour"
            value={stats?.peakHour || '—'}
            subtitle="Busiest time today"
          />
        </View>

        {/* ── Monthly Trend Preview ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Typography variant="bodySmallBold" style={styles.cardTitle}>
              Monthly Trend
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Last 12 months
            </Typography>
          </View>

          {stats?.monthlyTrend && stats.monthlyTrend.length > 0 ? (
            <SimpleBarChart
              data={stats.monthlyTrend.map((p) => ({
                label: p.month,
                value: p.visits,
              }))}
              height={160}
              barColor={BrandColors.tealDark}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Typography variant="caption" color="textSecondary">
                No monthly data available
              </Typography>
            </View>
          )}
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
    marginBottom: Spacing.one,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyChart: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafe',
    borderRadius: Radius.md,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
