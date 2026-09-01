import { Feather } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, ScrollView, Pressable } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/core/hooks';
import { BottomTabInset, Radius, Spacing } from '@/core/theme';

import { EmptyState } from '@/shared/components/EmptyState';
import { Pagination } from '@/shared/components/Pagination';
import { SearchBar } from '@/shared/components/SearchBar';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { StaffCard } from '../components/StaffCard';
import { useStaff } from '../hooks/useStaff';
import type { Staff } from '../../domain/Staff';

interface AdminStaffScreenProps {
  onNavigateToDetail: (staff: Staff) => void;
  onNavigateToCreate: () => void;
}

export function AdminStaffScreen({
  onNavigateToDetail,
  onNavigateToCreate,
}: AdminStaffScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { staff, loading, refresh, page, totalPages, setPage } = useStaff();
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

  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.status?.toUpperCase() === 'ACTIVE').length;
  const inactiveStaff = staff.filter((s) => s.status?.toUpperCase() === 'INACTIVE').length;

  const renderItem = useCallback(
    ({ item }: { item: Staff }) => (
      <StaffCard staff={item} onPress={onNavigateToDetail} />
    ),
    [onNavigateToDetail],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Search staff by name or role..."
            />
          </View>
          <Pressable
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={onNavigateToCreate}
            accessibilityLabel="Add staff"
          >
            <Feather name="plus" size={20} color={theme.background} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <Pressable style={[styles.filterChip, { backgroundColor: theme.primary }]}>
            <Typography variant="bodySmallBold" style={{ color: theme.background }}>
              All · {totalStaff}
            </Typography>
          </Pressable>
          <Pressable style={[styles.filterChip, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="bodySmallBold" color="textSecondary">
              Active · {activeStaff}
            </Typography>
          </Pressable>
          <Pressable style={[styles.filterChip, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="bodySmallBold" color="textSecondary">
              Inactive · {inactiveStaff}
            </Typography>
          </Pressable>
        </ScrollView>
      </View>
    ),
    [search, totalStaff, activeStaff, inactiveStaff, theme, onNavigateToCreate],
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
          onPress={!search ? onNavigateToCreate : undefined}
        />
      ) : null,
    [loading, search, onNavigateToCreate],
  );

  const renderFooter = useCallback(() => {
    if (loading && staff.length === 0) return null;
    return (
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    );
  }, [loading, staff.length, page, totalPages, setPage]);

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <FlatList
          data={filteredStaff}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 120 }
          ]}
          refreshing={loading}
          onRefresh={refresh}
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.four,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  filterChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
});