import { useState, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useRouter } from 'expo-router';
import { Dropdown } from '@/shared/components/Dropdown/Dropdown';
import { useStaffSchedule } from '../../hooks/useStaffSchedule';
import { useTrainerSchedule } from '../../hooks/useTrainerSchedule';
import { StaffScheduleHeaderCard } from '../components/StaffScheduleHeaderCard';
import { StaffScheduleStatsGrid } from '../components/StaffScheduleStatsGrid';
import { StaffAddTaskButton } from '../components/StaffAddTaskButton';
import { StaffTaskItemCard } from '../components/StaffTaskItemCard';
import { StaffUpcomingFollowUpsCard } from '../components/StaffUpcomingFollowUpsCard';
import { StaffProductivityTipCard } from '../components/StaffProductivityTipCard';

export function StaffScheduleScreen() {
  const router = useRouter();
  const [taskAction, setTaskAction] = useState('');
  
  const { data, isLoading, refetch, isRefetching, toggleTask } = useStaffSchedule();

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data: trainerData, isLoading: isTrainerLoading, refetch: refetchTrainer } = useTrainerSchedule(todayStr, todayStr);

  const combinedTasks = useMemo(() => {
    if (!data) return [];
    
    const staffTasks = data.tasks || [];
    
    const classes = trainerData?.weekSchedule?.[0]?.sessions || [];
    const classTasks = classes.map((cls: any) => ({
      id: `class-${cls.id}`,
      time: cls.time,
      type: 'Class',
      name: cls.member || 'Class',
      action: cls.type || 'Scheduled Class',
      priority: 'medium' as const,
      completed: cls.status === 'completed',
    }));

    return [...staffTasks, ...classTasks];
  }, [data, trainerData]);

  const handleRefresh = () => {
    refetch();
    refetchTrainer();
  };

  if ((isLoading && !data) || (isTrainerLoading && !trainerData)) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading schedule..." />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: '#64748B' }}>Failed to load schedule.</Text>
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
          onRefresh={handleRefresh}
          tintColor={BrandColors.teal}
          colors={[BrandColors.teal]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <StaffScheduleHeaderCard
        dateText={data.dateText}
        tasksCount={combinedTasks.length}
        urgentCount={combinedTasks.filter((t) => t.priority === 'high').length}
      />
      <StaffScheduleStatsGrid stats={data.stats} />
      
      <View style={styles.dropdownContainer}>
        <Dropdown
          placeholder="Add New Task"
          value={taskAction}
          onChange={(val) => {
            setTaskAction(val);
            if (val === 'add_lead') {
              router.push('/(staff)/leads/add' as any);
              setTaskAction(''); // reset dropdown
            } else if (val === 'schedule_class') {
              router.push('/(staff)/schedule/add-class' as any);
              setTaskAction(''); 
            }
          }}
          options={[
            { label: 'Add New Lead', value: 'add_lead' },
            { label: 'Schedule New Class', value: 'schedule_class' }
          ]}
          customTrigger={(openSheet) => (
            <StaffAddTaskButton onPress={openSheet} />
          )}
        />can you 
      </View>

      {/* Today's Tasks Section */}
      <View style={styles.tasksSection}>
        <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
        <View style={styles.tasksList}>
          {combinedTasks.map((task) => (
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
  dropdownContainer: {
    marginBottom: Spacing.two,
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
