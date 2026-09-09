import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { GlassBlob, Loader } from '@/shared/components';
import { useStaffDashboard } from '../../hooks/useStaffDashboard';
import { StaffWelcomeCard } from '../components/StaffWelcomeCard';
import { StaffStatsGrid } from '../components/StaffStatsGrid';
import { StaffQuickActions } from '../components/StaffQuickActions';
import { StaffUrgentFollowUpsCard } from '../components/StaffUrgentFollowUpsCard';
import { StaffRecentConversionsCard } from '../components/StaffRecentConversionsCard';
import { StaffMonthSummaryCard } from '../components/StaffMonthSummaryCard';

export function StaffDashboardScreen() {
  const { data, isLoading, refetch, isRefetching } = useStaffDashboard();

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading dashboard..." />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GlassBlob color={BrandColors.teal} size={260} opacity={0.22} top={-70} right={-80} />
      <GlassBlob color={BrandColors.tealDark} size={220} opacity={0.18} top={420} left={-90} />
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
        <StaffWelcomeCard staffInfo={data.staffInfo} />
        <StaffStatsGrid stats={data.todaysStats} />
        <StaffQuickActions />
        <StaffUrgentFollowUpsCard followUps={data.urgentFollowUps} />
        <StaffRecentConversionsCard conversions={data.recentConversions} />
        <StaffMonthSummaryCard summary={data.monthlySummary} />
      </ScrollView>
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
