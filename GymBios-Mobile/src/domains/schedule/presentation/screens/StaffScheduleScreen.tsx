import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useStaffSchedule } from '../../hooks/useStaffSchedule';
import { StaffScheduleHeaderCard } from '../components/StaffScheduleHeaderCard';
import { StaffScheduleStatsGrid } from '../components/StaffScheduleStatsGrid';
import { StaffAddTaskButton } from '../components/StaffAddTaskButton';
import { StaffTaskItemCard } from '../components/StaffTaskItemCard';
import { StaffUpcomingFollowUpsCard } from '../components/StaffUpcomingFollowUpsCard';
import { StaffProductivityTipCard } from '../components/StaffProductivityTipCard';

export function StaffScheduleScreen() {
  const { data, isLoading, refetch, isRefetching, toggleTask } = useStaffSchedule();

  if (isLoading && !data) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading schedule..." />
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
      <StaffScheduleHeaderCard
        dateText={data.dateText}
        tasksCount={data.tasks.length}
        urgentCount={data.tasks.filter((t) => t.priority === 'high').length}
      />
      <StaffScheduleStatsGrid stats={data.stats} />
      <StaffAddTaskButton />

      {/* Today's Tasks Section */}
      <View style={styles.tasksSection}>
        <Text style={styles.sectionTitle}>Today's Tasks</Text>
        <View style={styles.tasksList}>
          {data.tasks.map((task) => (
            <StaffTaskItemCard
              key={task.id}
              task={task}
              onToggleComplete={toggleTask}
            />
          ))}
        </View>
      </View>

      <StaffUpcomingFollowUpsCard followUps={data.upcomingFollowUps} />
      <StaffProductivityTipCard tip={data.productivityTip} />
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
  tasksSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: Spacing.three,
  },
  tasksList: {
    gap: Spacing.two,
  },
});
