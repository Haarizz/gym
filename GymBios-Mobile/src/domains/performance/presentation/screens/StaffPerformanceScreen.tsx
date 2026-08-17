import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useStaffPerformance } from '../../hooks/useStaffPerformance';
import { StaffTargetProgressCard } from '../components/StaffTargetProgressCard';
import { StaffKeyMetricsGrid } from '../components/StaffKeyMetricsGrid';
import { StaffMonthlyTrendChart } from '../components/StaffMonthlyTrendChart';
import { StaffLeaderboardCard } from '../components/StaffLeaderboardCard';
import { StaffBreakdownCard } from '../components/StaffBreakdownCard';
import { StaffMotivationCard } from '../components/StaffMotivationCard';

export function StaffPerformanceScreen() {
  const { data, isLoading, refetch, isRefetching } = useStaffPerformance();

  if (isLoading || !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading performance..." />
      </View>
    );
  }

  return (
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
      <StaffTargetProgressCard targets={data.targets} />
      <StaffKeyMetricsGrid targets={data.targets} />
      <StaffMonthlyTrendChart data={data.monthlyTrends} />
      <StaffLeaderboardCard leaderboard={data.leaderboard} />
      <StaffBreakdownCard breakdown={data.breakdown} />
      <StaffMotivationCard message={data.motivationMessage} />
    </ScrollView>
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
