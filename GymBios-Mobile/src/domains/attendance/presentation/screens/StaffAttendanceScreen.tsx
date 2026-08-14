import { useCallback, useMemo, useState } from 'react';
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

import { useStaffAttendance } from '../hooks/useStaffAttendance';
import {
  AttendanceErrorState,
  AttendanceSkeleton,
  StaffAttendanceCard,
} from '../components';
import type { StaffAttendanceRecord } from '../hooks/useStaffAttendance';

interface StaffAttendanceScreenProps {
  onBack?: () => void;
}

/**
 * Staff & Trainers Attendance — today's clock-in / clock-out records
 * for all staff and trainers.
 *
 * Mobile adaptation of the web frontend's "Staff & Trainers" tab:
 * replaces the desktop table with stacked cards and moves the search
 * into a sticky header.
 */
export function StaffAttendanceScreen({ onBack }: StaffAttendanceScreenProps) {
  const { staffRecords, loading, error, refresh } = useStaffAttendance();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return staffRecords;

    const term = search.toLowerCase();
    return staffRecords.filter(
      (r) =>
        r.staffName.toLowerCase().includes(term) ||
        r.staffBizId.toLowerCase().includes(term) ||
        r.staffRole.toLowerCase().includes(term),
    );
  }, [staffRecords, search]);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const renderItem = ({ item }: { item: StaffAttendanceRecord }) => (
    <StaffAttendanceCard record={item} />
  );

  const keyExtractor = (item: StaffAttendanceRecord) => String(item.id);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading && !staffRecords.length) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Staff & Trainers"
          subtitle="Today's clock-in / clock-out records"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search staff..."
          />
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
          title="Staff & Trainers"
          subtitle="Today's clock-in / clock-out records"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search staff..."
          />
        </View>
        <AttendanceErrorState
          message={error.message}
          onRetry={handleRefresh}
        />
      </ScreenLayout>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!loading && filtered.length === 0) {
    return (
      <ScreenLayout>
        <AppHeader
          title="Staff & Trainers"
          subtitle="Today's clock-in / clock-out records"
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search staff..."
          />
        </View>
        <EmptyState
          title="No staff clocked in"
          description="No staff or trainer attendance records found for today."
          icon="briefcase"
        />
      </ScreenLayout>
    );
  }

  // ── Content ────────────────────────────────────────────────────────────────

  return (
    <ScreenLayout>
      <AppHeader
        title="Staff & Trainers"
        subtitle="Today's clock-in / clock-out records"
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <View style={styles.filters}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff..."
        />
      </View>

      <FlatList
        data={filtered}
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
});
