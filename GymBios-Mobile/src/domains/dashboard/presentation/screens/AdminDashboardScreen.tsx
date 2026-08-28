import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import type { AdminReportType } from '../../domain/AdminDashboardData';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { AdminTopControls } from '../components/AdminTopControls';
import { AdminAlertsList } from '../components/AdminAlertsList';
import { AdminKpiGrid } from '../components/AdminKpiGrid';
import { AdminPaymentMixCard } from '../components/AdminPaymentMixCard';
import { AdminOperationalHighlightsCard } from '../components/AdminOperationalHighlightsCard';
import { AdminQuickActionsCard } from '../components/AdminQuickActionsCard';
import { AdminReportDetailSheet } from '../components/AdminReportDetailSheet';

export function AdminDashboardScreen() {
  const [selectedReport, setSelectedReport] = useState<AdminReportType>(null);
  const { data, isLoading, refetch, isRefetching } = useAdminDashboard();

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading dashboard..." />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
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
          onRefreshPress={() => refetch()}
        />

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
        onClose={() => setSelectedReport(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.screenBackground,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 40,
    gap: Spacing.four,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
});
