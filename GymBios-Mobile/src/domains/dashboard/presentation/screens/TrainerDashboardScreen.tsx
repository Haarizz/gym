import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { BrandColors, Spacing } from '@/core/theme';
import { GlassBlob, Loader } from '@/shared/components';
import { TAB_BAR_HEIGHT } from '@/shared/layouts/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrainerDashboard } from '../../hooks/useTrainerDashboard';
import { TrainerWelcomeCard } from '../components/TrainerWelcomeCard';
import { TrainerStatsGrid } from '../components/TrainerStatsGrid';
import { TrainerPendingTasksCard } from '../components/TrainerPendingTasksCard';
import { TrainerTodayScheduleCard } from '../components/TrainerTodayScheduleCard';
import { TrainerQuickActions } from '../components/TrainerQuickActions';

export function TrainerDashboardScreen() {
  const { data, isLoading, refetch, isRefetching, togglePendingTask, startSession, finishSession } = useTrainerDashboard();
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
        <GlassBlob color={BrandColors.trainerAmber} size={260} opacity={0.24} top={-70} right={-80} />
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
        <TrainerTodayScheduleCard
          sessions={data.todaySessions}
          onStartSession={(session) => startSession(session.id)}
          onFinishSession={(session) => finishSession(session.id)}
        />
        <TrainerQuickActions />
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
