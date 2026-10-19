import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('membershipPlans.list.branchRequiredMsg'), {
        title: t('membershipPlans.list.branchRequiredTitle'),
      });
      return;
    }
    onNavigateToCreate();
  }, [selectedBranchId, onNavigateToCreate, t]);

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
        toast.error(t('membershipPlans.list.duplicateErrorMsg'), {
          title: t('membershipPlans.list.duplicateErrorTitle'),
        });
      }
    },
    [duplicatePlan, t],
  );

  const handleDelete = useCallback(
    (plan: MembershipPlan) => {
      Alert.alert(
        t('membershipPlans.list.deleteTitle'),
        t('membershipPlans.list.deleteConfirm', { name: plan.name }),
        [
          { text: t('membershipPlans.list.cancel'), style: 'cancel' },
          {
            text: t('membershipPlans.list.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePlan(plan.id);
              } catch {
                toast.error(t('membershipPlans.list.deleteError'), {
                  title: t('membershipPlans.list.duplicateErrorTitle'),
                });
              }
            },
          },
        ],
      );
    },
    [deletePlan, t],
  );

  // Must be an element, not a component: a component whose identity changes on
  // every keystroke is remounted by FlatList, which drops focus from the search input.
  const listHeader = useMemo(
    () => (
      <View style={styles.headerContainer}>
        {/* Page title */}
        <View style={styles.titleRow}>
          <Typography variant="subtitle" style={styles.title}>
            {t('membershipPlans.list.title')}
          </Typography>
          <Button
            label={t('membershipPlans.list.newSubscriptionBtn')}
            onPress={handleCreatePress}
            size="md"
          />
        </View>

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('membershipPlans.list.searchPlaceholder')}
        />

        {/* Status filter chips */}
        <MembershipPlanFilter selected={statusFilter} onSelect={setStatusFilter} />
      </View>
    ),
    [search, statusFilter, handleCreatePress, t],
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
          ListHeaderComponent={listHeader}
          emptyTitle={
            search || statusFilter !== 'All'
              ? 'No Subscriptions Found'
              : 'No Subscriptions'
          }
          emptyDescription={
            search || statusFilter !== 'All'
              ? 'Try adjusting your search or filters.'
              : 'Create your first subscription to get started.'
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
