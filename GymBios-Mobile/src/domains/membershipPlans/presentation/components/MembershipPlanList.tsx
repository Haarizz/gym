import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import type { MembershipPlan } from '../../domain/MembershipPlan';
import { MembershipPlanCard } from './MembershipPlanCard';

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
  emptyTitle = 'No Plans Found',
  emptyDescription = 'Create your first membership plan to get started.',
}: MembershipPlanListProps) {
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
        />
      ) : null,
    [loading, emptyTitle, emptyDescription],
  );

  if (loading && plans.length === 0) {
    return (
      <View style={styles.loaderContainer}>
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
      contentContainerStyle={styles.listContent}
      refreshing={loading}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
    paddingBottom: Spacing.six,
    paddingTop: Spacing.two,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
