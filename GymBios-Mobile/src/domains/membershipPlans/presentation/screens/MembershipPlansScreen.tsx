import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Feather from '@expo/vector-icons/Feather';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { SearchBar } from '@/shared/components/SearchBar';
import { Typography } from '@/shared/components/Typography';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import type { MembershipPlan } from '../../domain/MembershipPlan';
import { useMembershipPlans } from '../hooks/useMembershipPlans';
import { MembershipPlanList } from '../components/MembershipPlanList';
import { MembershipPlanFilter, type StatusFilter } from '../components/MembershipPlanFilter';
import { useBranchContext } from '@/shared/providers/BranchProvider';

import { toast } from '@/shared/components/Toasts/toastStore';

// RoleTabsLayout already pads the top inset and the list pads past the tab bar.
const TAB_SCREEN_EDGES = ['left', 'right'] as const;

interface MembershipPlansScreenProps {
  onNavigateToCreate: () => void;
  onNavigateToEdit: (plan: MembershipPlan) => void;
}

export function MembershipPlansScreen({
  onNavigateToCreate,
  onNavigateToEdit,
}: MembershipPlansScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
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

  const kpis = useMemo(() => {
    const isActive = (p: MembershipPlan) => p.status?.toUpperCase() === 'ACTIVE';
    return [
      { key: 'total', label: t('membershipPlans.list.kpiTotal'), value: plans.length, color: theme.text },
      { key: 'active', label: t('membershipPlans.list.kpiActive'), value: plans.filter(isActive).length, color: '#16a34a' },
      {
        key: 'offers',
        label: t('membershipPlans.list.kpiOnOffer'),
        value: plans.filter(p => p.offerActive && p.offerDiscountAmount > 0).length,
        color: '#ea580c',
      },
    ];
  }, [plans, theme.text, t]);

  const isFiltered = !!search || statusFilter !== 'All';

  // Must be an element, not a component: a component whose identity changes on
  // every keystroke is remounted by FlatList, which drops focus from the search input.
  const listHeader = useMemo(
    () => (
      <View style={styles.headerContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('membershipPlans.list.searchPlaceholder')}
        />

        <View style={styles.summaryRow}>
          {kpis.map(kpi => (
            <View
              key={kpi.key}
              style={[styles.summaryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <Typography variant="caption" color="textSecondary" style={styles.summaryLabel} numberOfLines={1}>
                {kpi.label}
              </Typography>
              <Typography variant="subtitle" style={[styles.summaryValue, { color: kpi.color }]}>
                {loading && plans.length === 0 ? '—' : kpi.value}
              </Typography>
            </View>
          ))}
        </View>

        <MembershipPlanFilter selected={statusFilter} onSelect={setStatusFilter} />
      </View>
    ),
    [search, statusFilter, kpis, loading, plans.length, theme, t],
  );

  const listFooter = useMemo(
    () => (
      <Pressable
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        onPress={handleCreatePress}
        accessibilityRole="button"
      >
        <Feather name="plus" size={18} color={BrandColors.white} />
        <Typography variant="bodySmallBold" style={styles.addButtonLabel}>
          {t('membershipPlans.list.addBtn')}
        </Typography>
      </Pressable>
    ),
    [handleCreatePress, t],
  );

  return (
    <ScreenLayout edges={TAB_SCREEN_EDGES}>
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
          ListFooterComponent={listFooter}
          emptyTitle={isFiltered ? t('membershipPlans.list.noPlansFound') : t('membershipPlans.list.noPlans')}
          emptyDescription={
            isFiltered ? t('membershipPlans.list.emptyFiltered') : t('membershipPlans.list.emptyUnfiltered')
          }
          emptyActionLabel={isFiltered ? undefined : t('membershipPlans.list.addBtn')}
          onEmptyAction={handleCreatePress}
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.md,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: BrandColors.teal,
    marginTop: Spacing.one,
  },
  addButtonPressed: {
    backgroundColor: BrandColors.tealDark,
  },
  addButtonLabel: {
    color: BrandColors.white,
  },
});
