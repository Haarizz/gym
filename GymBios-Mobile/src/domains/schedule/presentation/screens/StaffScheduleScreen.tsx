import { useState, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/shared/components/AppText';
import { format, isToday, parse } from 'date-fns';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Loader } from '@/shared/components';
import { useRouter } from 'expo-router';
import { Dropdown } from '@/shared/components/Dropdown/Dropdown';
import { DatePickerModal } from '@/shared/components/DatePicker';
import { toast } from '@/shared/components/Toasts/toastStore';
import { CompleteFollowUpSheet } from '@/domains/followUps';
import type { ScheduleTask } from '../../domain/StaffScheduleData';
import type { NextFollowUpRequest } from '../../infrastructure/ApiStaffScheduleRepository';
import { useStaffSchedule } from '../../hooks/useStaffSchedule';
import { useStaffAllClasses } from '../../staff/presentation/hooks/useStaffClasses';
import { StaffScheduleHeaderCard } from '../components/StaffScheduleHeaderCard';
import { StaffScheduleStatsGrid } from '../components/StaffScheduleStatsGrid';
import { StaffAddTaskButton } from '../components/StaffAddTaskButton';
import { StaffTaskItemCard } from '../components/StaffTaskItemCard';
import { StaffUpcomingFollowUpsCard } from '../components/StaffUpcomingFollowUpsCard';
import { StaffProductivityTipCard } from '../components/StaffProductivityTipCard';
import { NextFollowUpSheet } from '../components/NextFollowUpSheet';
import { useTranslation } from 'react-i18next';

export function StaffScheduleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [taskAction, setTaskAction] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);

  const viewingToday = isToday(selectedDate);
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    completeTask,
    isCompleting,
    scheduleNextFollowUp,
    isSchedulingNext,
  } = useStaffSchedule(viewingToday ? undefined : selectedDateStr);

  // "Mark done" asks how it went; anything short of converted / not interested then offers
  // to book the next follow-up for the same lead.
  const [completingTask, setCompletingTask] = useState<ScheduleTask | null>(null);
  const [nextForTask, setNextForTask] = useState<ScheduleTask | null>(null);

  const handleMarkDone = (taskId: string | number) => {
    const task = data?.tasks.find((t) => t.id === taskId);
    if (task && !task.completed) setCompletingTask(task);
  };

  const handleCompleteSubmit = async (outcome: string, notes: string) => {
    const task = completingTask;
    if (!task) return;
    try {
      await completeTask({ taskId: task.id, outcome, notes: notes || undefined });
    } catch (err: any) {
      toast.error(err?.message || t('schedule.staff.failedToComplete'), { title: t('schedule.errorTitle') });
      return;
    }
    setCompletingTask(null);

    if (outcome === 'converted') {
      toast.success(
        t('schedule.staff.leadConvertedDesc'),
        { title: t('schedule.staff.leadConvertedTitle') },
      );
    } else if (outcome === 'not-interested') {
      toast.info(t('schedule.staff.leadClosedDesc'), { title: t('schedule.staff.leadClosedTitle') });
    } else {
      setNextForTask(task);
    }
  };

  const handleNextSubmit = async (request: NextFollowUpRequest) => {
    const task = nextForTask;
    if (!task) return;
    try {
      await scheduleNextFollowUp({ taskId: task.id, request });
    } catch (err: any) {
      toast.error(err?.message || t('schedule.staff.failedToScheduleNext'), { title: t('schedule.errorTitle') });
      return;
    }
    setNextForTask(null);
    toast.success(
      t('schedule.staff.nextFollowUpSuccess', {
        name: task.name,
        date: format(parse(request.dueDate, 'yyyy-MM-dd', new Date()), 'MMM d'),
      }),
      { title: t('schedule.staff.followUpScheduledTitle') },
    );
  };

  const { data: allClasses, isLoading: isClassesLoading, refetch: refetchClasses } = useStaffAllClasses(selectedDateStr, selectedDateStr);

  const combinedTasks = useMemo(() => {
    if (!data) return [];
    
    const staffTasks = data.tasks || [];
    
    const classes = allClasses || [];
    const classTasks = classes.map((cls) => {
      // Parse HH:mm:ss or HH:mm into a Date object and format it as hh:mm a
      let formattedTime = 'TBD';
      if (cls.startTime) {
        try {
          const timeParsed = parse(cls.startTime, cls.startTime.split(':').length === 3 ? 'HH:mm:ss' : 'HH:mm', new Date());
          formattedTime = format(timeParsed, 'hh:mm a');
        } catch (e) {
          formattedTime = cls.startTime;
        }
      }

      return {
        id: `class-${cls.id}`,
        time: formattedTime,
        type: 'Class',
        name: cls.name || 'Class',
        action: cls.trainerName || cls.type || 'Scheduled Class',
        priority: 'medium' as const,
        completed: cls.status === 'completed',
      };
    });

    return [...staffTasks, ...classTasks];
  }, [data, allClasses]);

  const handleRefresh = () => {
    refetch();
    refetchClasses();
  };

  if ((isLoading && !data) || (isClassesLoading && !allClasses)) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message={t('schedule.loadingSchedule')} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: '#64748B' }}>{t('schedule.failedToLoad')}</Text>
      </View>
    );
  }

  const dropdownOptions = [
    { label: t('schedule.staff.addNewLead'), value: 'add_lead' },
    { label: t('schedule.staff.scheduleNewClass'), value: 'schedule_class' }
  ];

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
        title={viewingToday ? t('schedule.todaySchedule') : t('schedule.title')}
        dateText={format(selectedDate, 'EEEE, MMMM d, yyyy')}
        tasksCount={combinedTasks.length}
        urgentCount={combinedTasks.filter((t) => t.priority === 'high').length}
        onCalendarPress={() => setDatePickerOpen(true)}
      />
      <DatePickerModal
        visible={isDatePickerOpen}
        value={selectedDate}
        mode="date"
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(date) => {
          setSelectedDate(date);
          setDatePickerOpen(false);
        }}
      />
      <StaffScheduleStatsGrid stats={data.stats} />
      
      <View style={styles.dropdownContainer}>
        <Dropdown
          placeholder={t('schedule.staff.addNewTask')}
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
          options={dropdownOptions}
          customTrigger={(openSheet) => (
            <StaffAddTaskButton onPress={openSheet} />
          )}
        />
      </View>

      {/* Today's Tasks Section */}
      <View style={styles.tasksSection}>
        <Text style={styles.sectionTitle}>
          {viewingToday ? t('schedule.staff.todaysTasks') : t('schedule.staff.tasksForDate', { date: format(selectedDate, 'MMM d') })}
        </Text>
        <View style={styles.tasksList}>
          {combinedTasks.map((task) => (
            <StaffTaskItemCard
              key={task.id}
              task={task}
              onToggleComplete={handleMarkDone}
            />
          ))}
        </View>
      </View>

      <StaffUpcomingFollowUpsCard followUps={data.upcomingFollowUps} />
      <StaffProductivityTipCard tip={data.productivityTip} />

      <CompleteFollowUpSheet
        visible={completingTask !== null}
        followUp={completingTask ? { leadName: completingTask.name } : null}
        onClose={() => setCompletingTask(null)}
        onSubmit={handleCompleteSubmit}
        submitting={isCompleting}
      />
      {nextForTask && (
        <NextFollowUpSheet
          visible
          leadName={nextForTask.name}
          onSkip={() => setNextForTask(null)}
          onSubmit={handleNextSubmit}
          submitting={isSchedulingNext}
        />
      )}
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
