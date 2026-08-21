import { useState, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { BrandColors, Spacing } from '@/core/theme';
import { Loader, ConfirmationModal } from '@/shared/components';
import { useTrainerSchedule, useDeleteTrainerSession } from '../../hooks/useTrainerSchedule';
import { useScheduleSheet } from '../hooks/useScheduleSheet';
import { TrainerScheduleHeaderCard } from '../components/TrainerScheduleHeaderCard';
import { TrainerScheduleStatsGrid } from '../components/TrainerScheduleStatsGrid';
import { TrainerAddSessionButton } from '../components/TrainerAddSessionButton';
import { TrainerWeekScheduleCard } from '../components/TrainerWeekScheduleCard';
import { TrainerAvailabilityCard } from '../components/TrainerAvailabilityCard';
import { SessionFormSheet } from '../components/SessionFormSheet';
import { SessionDetailsSheet } from '../components/SessionDetailsSheet';
import { CustomDateRangeSheet } from '../components/CustomDateRangeSheet';
import { TrainerAvailabilitySheet } from '../components/TrainerAvailabilitySheet';

export function TrainerScheduleScreen() {
  const [filterType, setFilterType] = useState('this_week');
  const [customRange, setCustomRange] = useState({ start: new Date(), end: new Date() });
  const [showCustomRange, setShowCustomRange] = useState(false);

  const { startStr, endStr } = useMemo(() => {
    const today = new Date();
    if (filterType === 'this_week') {
      return {
        startStr: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endStr: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    } else if (filterType === 'next_week') {
      const nextWeek = addWeeks(today, 1);
      return {
        startStr: format(startOfWeek(nextWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        endStr: format(endOfWeek(nextWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    } else {
      return {
        startStr: format(customRange.start, 'yyyy-MM-dd'),
        endStr: format(customRange.end, 'yyyy-MM-dd'),
      };
    }
  }, [filterType, customRange]);

  const { data, isLoading, isError, error, refetch, isRefetching } = useTrainerSchedule(startStr, endStr);
  const sheetState = useScheduleSheet();
  const deleteMutation = useDeleteTrainerSession();

  const handleDeleteConfirm = () => {
    if (sheetState.selectedSession?.id) {
      deleteMutation.mutate(sheetState.selectedSession.id, {
        onSuccess: () => {
          sheetState.closeSheet();
        },
        onError: (err) => {
          alert(`Failed to delete session: ${err.message}`);
          sheetState.closeSheet();
        }
      });
    }
  };

  const handleFilterChange = (val: string) => {
    if (val === 'custom') {
      setShowCustomRange(true);
    } else {
      setFilterType(val);
    }
  };

  const handleApplyCustomRange = (start: Date, end: Date) => {
    setCustomRange({ start, end });
    setFilterType('custom');
    setShowCustomRange(false);
  };

  const handleCustomRangeClose = () => {
    setShowCustomRange(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <Loader message="Loading schedule..." />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>
          {isError ? String(error) : 'No schedule data available.'}
        </Text>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
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
      <TrainerScheduleHeaderCard
        dateRange={data.dateRange}
        totalSessions={data.totalSessions}
        filterValue={filterType}
        onFilterChange={handleFilterChange}
      />
      <TrainerScheduleStatsGrid stats={data.stats} />
      <TrainerAddSessionButton onPress={sheetState.openCreate} />
      <TrainerWeekScheduleCard weekSchedule={data.weekSchedule} onSessionPress={sheetState.openDetails} />
      <TrainerAvailabilityCard onUpdateSchedule={sheetState.openUpdateAvailability} />

      <SessionFormSheet
        visible={sheetState.mode === 'create' || sheetState.mode === 'edit'}
        mode={sheetState.mode === 'edit' ? 'edit' : 'create'}
        initialData={sheetState.selectedSession}
        onClose={sheetState.closeSheet}
      />

      <SessionDetailsSheet
        visible={sheetState.mode === 'details'}
        session={sheetState.selectedSession}
        onClose={sheetState.closeSheet}
        onEdit={sheetState.openEdit}
        onDelete={sheetState.openDelete}
      />

      <ConfirmationModal
        visible={sheetState.mode === 'delete'}
        title="Delete Session?"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onClose={sheetState.closeSheet}
        onConfirm={handleDeleteConfirm}
      />

      <CustomDateRangeSheet
        visible={showCustomRange}
        initialStart={customRange.start}
        initialEnd={customRange.end}
        onApply={handleApplyCustomRange}
        onClose={handleCustomRangeClose}
      />

      <TrainerAvailabilitySheet
        visible={sheetState.mode === 'update_availability'}
        onClose={sheetState.closeSheet}
      />
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.screenBackground,
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: BrandColors.trainerAmber,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
