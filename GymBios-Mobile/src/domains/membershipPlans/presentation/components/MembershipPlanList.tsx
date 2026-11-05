import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import type { MembershipPlan } from '../../domain/MembershipPlan';
import { MembershipPlanCard } from './MembershipPlanCard';
import { useTranslation } from 'react-i18next';

interface MembershipPlanListProps {
  plans: MembershipPlan[];
  loading: boolean;
  onRefresh: () => void;
  onPressCard: (plan: MembershipPlan) => void;
  onEdit: (plan: MembershipPlan) => void;
  onDuplicate: (plan: MembershipPlan) => void;
  onDelete: (plan: MembershipPlan) => void;
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Shown below the cards (only when there are any), e.g. an add button. */
  ListFooterComponent?: React.ReactElement | null;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}

export function MembershipPlanList({
  plans,
  loading,
  onRefresh,
  onPressCard,
  onEdit,
  onDuplicate,
  onDelete,
  ListHeaderComponent,
  emptyTitle: emptyTitleProp,
  emptyDescription: emptyDescriptionProp,
  ListFooterComponent,
  emptyActionLabel,
  onEmptyAction,
}: MembershipPlanListProps) {
  const { t } = useTranslation();
  const bottomInset = useTabBarBottomInset();
  const emptyTitle = emptyTitleProp ?? t('membershipPlans.list.noPlansFound');
  const emptyDescription = emptyDescriptionProp ?? t('membershipPlans.list.emptyUnfiltered');
  const renderItem = useCallback(
    ({ item }: { item: MembershipPlan }) => (
      <MembershipPlanCard
        plan={item}
        onPress={onPressCard}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    ),
    [onPressCard, onEdit, onDuplicate, onDelete],
  );

  const renderEmpty = useCallback(
    () =>
      !loading ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon="layers"
          buttonLabel={emptyActionLabel}
          onPress={onEmptyAction}
        />
      ) : null,
    [loading, emptyTitle, emptyDescription, emptyActionLabel, onEmptyAction],
  );

  if (loading && plans.length === 0) {
    return (
      <View style={[styles.listContent, styles.loaderContainer]}>
        {ListHeaderComponent && typeof ListHeaderComponent !== 'function' ? ListHeaderComponent : null}
        <Loader />
      </View>
    );
  }

  return (
    <FlatList
      data={plans}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={plans.length > 0 ? ListFooterComponent : null}
      contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + Spacing.six }]}
      refreshing={loading}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
  },
  loaderContainer: {
    flex: 1,
  },
});
