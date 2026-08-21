import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useTrainerPerformance } from '../../hooks/useTrainerPerformance';
import { TrainerTargetProgressCard } from '../components/TrainerTargetProgressCard';
import { TrainerKeyMetricsGrid } from '../components/TrainerKeyMetricsGrid';
import { TrainerMonthlyTrendChart } from '../components/TrainerMonthlyTrendChart';
import { TrainerPerformanceTipCard } from '../components/TrainerPerformanceTipCard';

export function TrainerPerformanceScreen() {
  const { data, isLoading, refetch, isRefetching } = useTrainerPerformance();

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
          tintColor={BrandColors.trainerAmber}
          colors={[BrandColors.trainerAmber]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <TrainerTargetProgressCard monthlyPerformance={data.monthlyPerformance} />
      <TrainerKeyMetricsGrid activeClients={data.activeClients} />
      <TrainerMonthlyTrendChart trend={data.sixMonthTrend} />
      <TrainerPerformanceTipCard tip={data.performanceTip} />
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
