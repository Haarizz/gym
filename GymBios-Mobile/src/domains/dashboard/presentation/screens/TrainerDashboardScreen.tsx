import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useTrainerDashboard } from '../../hooks/useTrainerDashboard';
import { TrainerWelcomeCard } from '../components/TrainerWelcomeCard';
import { TrainerStatsGrid } from '../components/TrainerStatsGrid';
import { TrainerPendingTasksCard } from '../components/TrainerPendingTasksCard';
import { TrainerTodayScheduleCard } from '../components/TrainerTodayScheduleCard';
import { TrainerQuickActions } from '../components/TrainerQuickActions';

export function TrainerDashboardScreen() {
  const { data, isLoading, refetch, isRefetching, togglePendingTask } = useTrainerDashboard();

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading dashboard..." />
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
      <TrainerWelcomeCard trainerInfo={data.trainerInfo} />
      <TrainerStatsGrid stats={data.todaysStats} />
      <TrainerPendingTasksCard
        tasks={data.pendingTasks}
        onToggleTask={togglePendingTask}
      />
      <TrainerTodayScheduleCard sessions={data.todaySessions} />
      <TrainerQuickActions />
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
