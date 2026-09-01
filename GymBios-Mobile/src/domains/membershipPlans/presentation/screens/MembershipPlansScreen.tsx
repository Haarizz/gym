import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { SearchBar } from '@/shared/components/SearchBar';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Button } from '@/shared/components/Button';
import type { MembershipPlan } from '../../domain/MembershipPlan';
import { useMembershipPlans } from '../hooks/useMembershipPlans';
import { MembershipPlanList } from '../components/MembershipPlanList';
import { MembershipPlanFilter, type StatusFilter } from '../components/MembershipPlanFilter';
import { useBranchContext } from '@/shared/providers/BranchProvider';

import { toast } from '@/shared/components/Toasts/toastStore';

interface MembershipPlansScreenProps {
  onNavigateToCreate: () => void;
  onNavigateToEdit: (plan: MembershipPlan) => void;
}

export function MembershipPlansScreen({
  onNavigateToCreate,
  onNavigateToEdit,
}: MembershipPlansScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const { plans, loading, refresh, deletePlan, duplicatePlan, submitting } =
    useMembershipPlans();

  const filteredPlans = useMemo(() => {
    let result = plans;

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(
        (p) => p.status.toUpperCase() === statusFilter.toUpperCase(),
      );
    }

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.planType?.toLowerCase().includes(query) ||
          p.type?.toLowerCase().includes(query),
      );
    }

    return result;
  }, [plans, statusFilter, search]);

  const { selectedBranchId } = useBranchContext();

  const handleCreatePress = useCallback(() => {
    if (selectedBranchId === 'ALL') {
      toast.error('Please select a specific branch from the header menu before creating a new membership plan.', {
        title: 'Branch Required'
      });
      return;
    }
    onNavigateToCreate();
  }, [selectedBranchId, onNavigateToCreate]);

  const handleEdit = useCallback(
    (plan: MembershipPlan) => {
      onNavigateToEdit(plan);
    },
    [onNavigateToEdit],
  );

  const handleDuplicate = useCallback(
    async (plan: MembershipPlan) => {
      try {
        await duplicatePlan(plan.id);
      } catch {
        toast.error('Failed to duplicate plan. Please try again.', {
          title: 'Error'
        });
      }
    },
    [duplicatePlan],
  );

  const handleDelete = useCallback(
    (plan: MembershipPlan) => {
      Alert.alert(
        'Delete Plan',
        `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePlan(plan.id);
              } catch {
                toast.error('Failed to delete plan.', {
                  title: 'Error'
                });
              }
            },
          },
        ],
      );
    },
    [deletePlan],
  );

  const renderListHeader = useCallback(
    () => (
      <View style={styles.headerContainer}>
        {/* Page title */}
        <View style={styles.titleRow}>
          <Typography variant="subtitle" style={styles.title}>
            Membership Plans
          </Typography>
          <Button
            label="+ New Plan"
            onPress={handleCreatePress}
            size="md"
          />
        </View>

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search plans by name or type..."
        />

        {/* Status filter chips */}
        <MembershipPlanFilter selected={statusFilter} onSelect={setStatusFilter} />
      </View>
    ),
    [search, statusFilter, handleCreatePress],
  );

  return (
    <ScreenLayout>
      <View style={styles.container}>
        <MembershipPlanList
          plans={filteredPlans}
          loading={loading}
          onRefresh={refresh}
          onPressCard={handleEdit}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          ListHeaderComponent={renderListHeader}
          emptyTitle={
            search || statusFilter !== 'All'
              ? 'No Plans Found'
              : 'No Membership Plans'
          }
          emptyDescription={
            search || statusFilter !== 'All'
              ? 'Try adjusting your search or filters.'
              : 'Create your first membership plan to get started.'
          }
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
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
