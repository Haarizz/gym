import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { BrandColors, Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { SearchBar } from '@/shared/components/SearchBar';
import { EmptyState } from '@/shared/components/EmptyState';

import { useStaffAttendance } from '../hooks/useStaffAttendance';
import {
  AttendanceErrorState,
  AttendanceSkeleton,
  StaffAttendanceCard,
} from '../components';
import type { StaffAttendanceRecord } from '../hooks/useStaffAttendance';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { staffRecords, loading, error, refresh } = useStaffAttendance();
  const [search, setSearch] = useState('');
  const bottomInset = useTabBarBottomInset() + Spacing.six;

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
          title={t('attendance.staff.title')}
          subtitle={t('attendance.staff.subtitle')}
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t('attendance.staff.searchPlaceholder')}
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
          title={t('attendance.staff.title')}
          subtitle={t('attendance.staff.subtitle')}
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t('attendance.staff.searchPlaceholder')}
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
          title={t('attendance.staff.title')}
          subtitle={t('attendance.staff.subtitle')}
          colors={[BrandColors.teal, BrandColors.tealDark]}
          onBack={onBack}
        />
        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t('attendance.staff.searchPlaceholder')}
          />
        </View>
        <EmptyState
          title={t('attendance.misc.noStaffClockedIn')}
          description={t('attendance.misc.noStaffClockedInDesc')}
          icon="briefcase"
        />
      </ScreenLayout>
    );
  }

  // ── Content ────────────────────────────────────────────────────────────────

  return (
    <ScreenLayout>
      <AppHeader
        title={t('attendance.staff.title')}
        subtitle={t('attendance.staff.subtitle')}
        colors={[BrandColors.teal, BrandColors.tealDark]}
        onBack={onBack}
      />

      <View style={styles.filters}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('attendance.staff.searchPlaceholder')}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
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
  },
});
