import { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { BottomTabInset, BrandColors, Radius, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';

import { useAttendanceReport, useAttendanceStats } from '../../hooks/useAttendance';
import { useReportDateRange } from '../hooks/useReportDateRange';
import {
  ActivityBreakdownList,
  AttendanceErrorState,
  AttendanceSkeleton,
  DailySummaryList,
  InsightsList,
  MemberTrendsList,
  PeakHoursList,
  ReportPeriodSelector,
  ReportSummaryRow,
} from '../components';

interface AttendanceReportsScreenProps {
  onBack?: () => void;
}

/**
 * Attendance Reports — detailed analytics and exports for a configurable
 * date range.
 *
 * Mobile adaptation of the web frontend's "Attendance Reports" page:
 * replaces the tabbed interface with a single scrollable view that
 * stacks all report sections vertically for easy scanning on a small
 * screen.  The period selector stays sticky at the top.
 */
export function AttendanceReportsScreen({ onBack }: AttendanceReportsScreenProps) {
  const { period, apiRange, setPeriod } = useReportDateRange();

  const {
    report,
    loading: reportLoading,
    error: reportError,
    refresh: refreshReport,
  } = useAttendanceReport(apiRange);

  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useAttendanceStats();

  const loading = reportLoading || statsLoading;
  const error = reportError || statsError;

  const handleRefresh = useCallback(() => {
    refreshReport();
    refreshStats();
  }, [refreshReport, refreshStats]);


  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading && !report) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Reports"
          subtitle="Detailed analytics & exports"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <ReportPeriodSelector value={period} onChange={setPeriod} />
        </View>
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
          title="Reports"
          subtitle="Detailed analytics & exports"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <ReportPeriodSelector value={period} onChange={setPeriod} />
        </View>
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <ScreenLayout>
      <AppHeader
        title="Reports"
        subtitle="Detailed analytics & exports"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <View style={styles.filters}>
        <ReportPeriodSelector value={period} onChange={setPeriod} />
      </View>

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
        {/* ── Report Summary ── */}
        {report?.summary ? (
          <ReportSummaryRow summary={report.summary} />
        ) : null}

        {/* ── Daily Summary ── */}
        <DailySummaryList rows={report?.dailySummary ?? []} />

        {/* ── Activity Breakdown ── */}
        <ActivityBreakdownList items={report?.activityBreakdown ?? []} />

        {/* ── Peak Hours ── */}
        <PeakHoursList rows={report?.peakHours ?? []} />

        {/* ── Member Trends ── */}
        <MemberTrendsList rows={report?.topConsistentMembers ?? []} />

        {/* ── Insights ── */}
        <InsightsList insights={report?.insights ?? []} />

        {/* ── Export Actions ── */}
        <View style={styles.exportSection}>
          <Button
            label="Export CSV"
            onPress={handleRefresh}
            variant="secondary"
            style={styles.exportButton}
          />
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  exportSection: {
    marginTop: Spacing.two,
  },
  exportButton: {
    alignSelf: 'stretch',
  },
});
