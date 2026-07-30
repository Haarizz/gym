import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { EmptyState } from '@/shared/components/EmptyState';
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
  const { staff, loading, refresh } = useStaff();
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
  const activeStaff = staff.filter((s) => s.status === 'ACTIVE').length;
  const inactiveStaff = staff.filter((s) => s.status === 'INACTIVE').length;

  const renderItem = useCallback(
    ({ item }: { item: Staff }) => (
      <StaffCard staff={item} onPress={onNavigateToDetail} />
    ),
    [onNavigateToDetail],
  );

  const renderHeader = useCallback(
    () => (
      <View style={styles.headerContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff by name or role..."
        />

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Total Staff
            </Typography>
            <Typography variant="title" style={styles.summaryValue}>
              {totalStaff}
            </Typography>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Active
            </Typography>
            <Typography variant="title" style={[styles.summaryValue, { color: '#15803d' }]}>
              {activeStaff}
            </Typography>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
            <Typography variant="caption" color="textSecondary">
              Inactive
            </Typography>
            <Typography variant="title" style={[styles.summaryValue, { color: '#dc2626' }]}>
              {inactiveStaff}
            </Typography>
          </View>
        </View>
      </View>
    ),
    [search, totalStaff, activeStaff, inactiveStaff, theme],
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

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <FlatList
          data={filteredStaff}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={refresh}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.fabContainer}>
          <Button
            label="+ Add Staff"
            onPress={onNavigateToCreate}
            size="lg"
            style={styles.fab}
          />
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  summaryCard: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  summaryValue: {
    fontSize: 20,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Spacing.four,
    left: Spacing.four,
    right: Spacing.four,
  },
  fab: {
    shadowColor: BrandColors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});