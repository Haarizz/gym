import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { GlassBlob, Loader } from '@/shared/components';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStaffDashboard } from '../../hooks/useStaffDashboard';
import { StaffWelcomeCard } from '../components/StaffWelcomeCard';
import { StaffStatsGrid } from '../components/StaffStatsGrid';
import { StaffQuickActions } from '../components/StaffQuickActions';
import { StaffUrgentFollowUpsCard } from '../components/StaffUrgentFollowUpsCard';
import { StaffRecentConversionsCard } from '../components/StaffRecentConversionsCard';
import { StaffMonthSummaryCard } from '../components/StaffMonthSummaryCard';

export function StaffDashboardScreen() {
  const { data, isLoading, refetch, isRefetching } = useStaffDashboard();
  const insets = useSafeAreaInsets();

  if (isLoading && !data) {
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
    gap: Spacing.four,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
});
