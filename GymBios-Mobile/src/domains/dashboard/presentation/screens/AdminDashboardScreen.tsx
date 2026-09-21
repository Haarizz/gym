import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { GlassBlob, Loader } from '@/shared/components';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AdminReportType } from '../../domain/AdminDashboardData';
import { todayRange, useAdminDashboard, type AdminDashboardDateRange } from '../../hooks/useAdminDashboard';
import { AdminTopControls } from '../components/AdminTopControls';
import { AdminAlertsList } from '../components/AdminAlertsList';
import { AdminKpiGrid } from '../components/AdminKpiGrid';
import { AdminPaymentMixCard } from '../components/AdminPaymentMixCard';
import { AdminOperationalHighlightsCard } from '../components/AdminOperationalHighlightsCard';
import { AdminQuickActionsCard } from '../components/AdminQuickActionsCard';
import { AdminReportDetailSheet } from '../components/AdminReportDetailSheet';
import { AdminBranchSelectSheet } from '../components/AdminBranchSelectSheet';
import { AdminDateRangeSheet } from '../components/AdminDateRangeSheet';

export function AdminDashboardScreen() {
  const [selectedReport, setSelectedReport] = useState<AdminReportType>(null);
  const [range, setRange] = useState<AdminDashboardDateRange>(todayRange());
  const [branchSheetOpen, setBranchSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useAdminDashboard(range);
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading dashboard..." />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280, overflow: 'hidden' }} pointerEvents="none">
        <GlassBlob color={BrandColors.teal} size={260} opacity={0.22} top={-70} right={-80} />
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 24 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={BrandColors.teal}
            colors={[BrandColors.teal]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AdminTopControls
          branch={data.branch}
          dateText={data.dateText}
          hasAlerts={data.alerts.length > 0}
          onSelectBranch={() => setBranchSheetOpen(true)}
          onCalendarPress={() => setDateSheetOpen(true)}
          onRefreshPress={() => refetch()}
        />

        {isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Couldn&apos;t load the latest dashboard data.</Text>
            <Text style={styles.errorRetry} onPress={() => refetch()}>Tap to retry</Text>
          </View>
        )}

        <AdminAlertsList alerts={data.alerts} />

        <AdminKpiGrid
          kpis={data.kpis}
          onSelectKpi={(reportId) => setSelectedReport(reportId)}
        />

        <AdminPaymentMixCard paymentMix={data.paymentMix} />

        <AdminOperationalHighlightsCard highlights={data.highlights} />

        <AdminQuickActionsCard />
      </ScrollView>

      <AdminReportDetailSheet
        selectedReport={selectedReport}
        range={range}
        onClose={() => setSelectedReport(null)}
      />

      <AdminBranchSelectSheet
        visible={branchSheetOpen}
        onClose={() => setBranchSheetOpen(false)}
      />

      <AdminDateRangeSheet
        visible={dateSheetOpen}
        range={range}
        onSelect={setRange}
        onClose={() => setDateSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
    flex: 1,
  },
  errorRetry: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '700',
  },
});
