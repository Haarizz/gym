import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { BottomTabInset, BrandColors, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { SearchBar } from '@/shared/components/SearchBar';
import { EmptyState } from '@/shared/components/EmptyState';
import { Typography } from '@/shared/components/Typography';

import { useAttendance, useCheckout } from '../../hooks';
import { useAttendanceFilters } from '../hooks/useAttendanceFilters';
import {
  AttendanceCard,
  AttendanceErrorState,
  AttendanceSkeleton,
  DatePeriodFilter,
} from '../components';
import type { Attendance } from '../../domain/Attendance';

interface TodayAttendanceScreenProps {
  onBack?: () => void;
}

/**
 * Today's Attendance — list of member & walk-in check-ins for the selected
 * date period, with manual checkout for active records.
 *
 * Mobile adaptation of the web frontend's "Today's Attendance" tab:
 * replaces the desktop table with stacked cards, moves search + date
 * filter into a sticky header, and uses pull-to-refresh.
 */
export function TodayAttendanceScreen({ onBack }: TodayAttendanceScreenProps) {
  const { datePeriod, search, apiFilters, setDatePeriod, setSearch } =
    useAttendanceFilters();

  const [page, setPage] = useState(0);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(0);
  }, [datePeriod, search]);

  const pagedFilters = useMemo(
    () => ({ ...apiFilters, page, size: 50 }),
    [apiFilters, page],
  );

  const {
    attendance,
    pagination,
    loading,
    error,
    refresh,
  } = useAttendance(pagedFilters);

  const { mutate: checkout } = useCheckout();

  const [checkingOutId, setCheckingOutId] = useState<number | null>(null);

  const handleCheckout = useCallback(
    (record: Attendance) => {
      setCheckingOutId(record.id);
      checkout(record.id, {
        onSettled: () => setCheckingOutId(null),
      });
    },
    [checkout],
  );

  const handleLoadMore = useCallback(() => {
    if (pagination && page + 1 < pagination.totalPages && !loading) {
      setPage((p) => p + 1);
    }
  }, [pagination, page, loading]);


  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const renderItem = ({ item }: { item: Attendance }) => (
    <AttendanceCard
      record={item}
      onCheckout={handleCheckout}
      checkingOut={checkingOutId === item.id}
    />
  );

  const keyExtractor = (item: Attendance) => String(item.id);

  const ListFooter = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        <Typography variant="caption" color="textSecondary">
          Page {pagination.page} of {pagination.totalPages} ·{' '}
          {pagination.total} records
        </Typography>
      </View>
    );
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading && !attendance.length) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Today's Attendance"
          subtitle="Active check-ins & manual checkout"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search members..."
          />
          <DatePeriodFilter value={datePeriod} onChange={setDatePeriod} />
        </View>
        <AttendanceSkeleton variant="list" count={5} />
      </ScreenLayout>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Today's Attendance"
          subtitle="Active check-ins & manual checkout"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search members..."
          />
          <DatePeriodFilter value={datePeriod} onChange={setDatePeriod} />
        </View>
        <AttendanceErrorState
          message={error.message}
          onRetry={handleRefresh}
        />
      </ScreenLayout>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!loading && attendance.length === 0) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Today's Attendance"
          subtitle="Active check-ins & manual checkout"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search members..."
          />
          <DatePeriodFilter value={datePeriod} onChange={setDatePeriod} />
        </View>
        <EmptyState
          title="No attendance records"
          description="No check-ins found for the selected period."
          icon="user-check"
        />
      </ScreenLayout>
    );
  }

  // ── Content ────────────────────────────────────────────────────────────────

  return (
    <ScreenLayout>
      <AppHeader
        title="Today's Attendance"
        subtitle="Active check-ins & manual checkout"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <View style={styles.filters}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search members..."
        />
        <DatePeriodFilter value={datePeriod} onChange={setDatePeriod} />
      </View>

      <FlatList
        data={attendance}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={BrandColors.teal}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={ListFooter}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  filters: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  pagination: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
