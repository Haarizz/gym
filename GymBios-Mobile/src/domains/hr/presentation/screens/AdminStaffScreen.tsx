import { Feather } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/hooks';
import { useCurrency } from '@/core/providers/CurrencyProvider';
import { BrandColors, Radius, Spacing } from '@/core/theme';

import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import { SearchBar } from '@/shared/components/SearchBar';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { toast } from '@/shared/components/Toasts/toastStore';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { StaffCard } from '../components/StaffCard';
import { useStaff, useStaffPerformance, useStaffSummary } from '../hooks/useStaff';
import type { Staff } from '../../domain/Staff';

interface AdminStaffScreenProps {
  onNavigateToDetail: (staff: Staff) => void;
  onNavigateToCreate: () => void;
}

// RoleTabsLayout already pads the top inset and the list pads past the tab bar.
const TAB_SCREEN_EDGES = ['left', 'right'] as const;

const PRESENT_COLOR = '#16a34a';
const ABSENT_COLOR = '#dc2626';

export function AdminStaffScreen({
  onNavigateToDetail,
  onNavigateToCreate,
}: AdminStaffScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { currencyCode } = useCurrency();
  const { staff, loading, refresh, page, totalPages, setPage } = useStaff();
  const { data: summary, refetch: refetchSummary } = useStaffSummary();
  const staffIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const {
    byStaffId: performanceById,
    refresh: refreshPerformance,
  } = useStaffPerformance(staffIds);
  const { selectedBranchId } = useBranchContext();

  const handleCreate = useCallback(() => {
    if (selectedBranchId === 'ALL') {
      toast.error('Please select a specific branch from the header menu before creating a new staff.', { title: 'Branch Required' });
      return;
    }
    onNavigateToCreate();
  }, [selectedBranchId, onNavigateToCreate]);

  const handleMessage = useCallback((member: Staff) => {
    if (!member.phone) {
      toast.info('This staff member does not have a phone number recorded.', {
        title: 'No Phone Number',
      });
      return;
    }
    Linking.openURL(`sms:${member.phone.replace(/\s+/g, '')}`).catch(() => {
      toast.error('Unable to launch SMS messaging on this device.', {
        title: 'Error',
      });
    });
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
    refetchSummary();
    refreshPerformance();
  }, [refresh, refetchSummary, refreshPerformance]);

  const [search, setSearch] = useState('');

  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staff;
    const query = search.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.role.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query),
    );
  }, [staff, search]);

  const renderItem = useCallback(
    ({ item }: { item: Staff }) => (
      <StaffCard
        staff={item}
        performance={performanceById.get(item.id)}
        currencyCode={currencyCode}
        onPress={onNavigateToDetail}
        onMessage={handleMessage}
      />
    ),
    [performanceById, currencyCode, onNavigateToDetail, handleMessage],
  );

  // Must be an element, not a component: a component whose identity changes on
  // every keystroke is remounted by FlatList, which drops focus from the search input.
  const listHeader = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff by name or role..."
        />

        <View style={styles.summaryRow}>
          {[
            { label: 'Total Staff', value: summary?.totalStaff, color: theme.text },
            { label: 'Present', value: summary?.presentToday, color: PRESENT_COLOR },
            { label: 'Absent', value: summary?.absentToday, color: ABSENT_COLOR },
          ].map((kpi) => (
            <View
              key={kpi.label}
              style={[styles.summaryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <Typography variant="caption" color="textSecondary" style={styles.summaryLabel}>
                {kpi.label}
              </Typography>
              <Typography variant="subtitle" style={[styles.summaryValue, { color: kpi.color }]}>
                {kpi.value ?? '—'}
              </Typography>
            </View>
          ))}
        </View>
      </View>
    ),
    [search, summary, theme],
  );

  const renderEmpty = useCallback(
    () =>
      !loading ? (
        <EmptyState
          title="No Staff Found"
          description={
            search
              ? 'Try adjusting your search query.'
              : 'Add your first staff member to get started.'
          }
          icon="users"
          buttonLabel={!search ? 'Add Staff' : undefined}
          onPress={!search ? handleCreate : undefined}
        />
      ) : null,
    [loading, search, handleCreate],
  );

  const renderFooter = useCallback(() => {
    if (loading && staff.length === 0) return null;
    return (
      <View style={styles.footer}>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
        {staff.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            onPress={handleCreate}
            accessibilityRole="button"
          >
            <Feather name="plus" size={18} color={BrandColors.white} />
            <Typography variant="bodySmallBold" style={styles.addButtonLabel}>
              Add New Staff Member
            </Typography>
          </Pressable>
        ) : null}
      </View>
    );
  }, [loading, staff.length, page, totalPages, setPage, handleCreate]);

  return (
    <ScreenLayout edges={TAB_SCREEN_EDGES}>
      <View style={styles.container}>
        <FlatList
          data={filteredStaff}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 120 }
          ]}
          refreshing={loading}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    padding: Spacing.md,
  },
  summaryLabel: {
    marginBottom: Spacing.one,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    gap: Spacing.three,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.teal,
  },
  addButtonPressed: {
    backgroundColor: BrandColors.tealDark,
  },
  addButtonLabel: {
    color: BrandColors.white,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.md,
  },
});
