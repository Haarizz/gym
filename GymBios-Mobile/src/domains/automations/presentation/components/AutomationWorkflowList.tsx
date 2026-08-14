import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { AutomationWorkflowCard } from './AutomationWorkflowCard';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { AutomationWorkflow } from '../../domain/types';
import { Spacing } from '@/core/theme';

interface AutomationWorkflowListProps {
  workflows: AutomationWorkflow[];
  isLoading: boolean;
  onRefresh: () => void;
  onWorkflowPress: (workflow: AutomationWorkflow) => void;
  ListHeaderComponent?: React.ReactElement;
}

export const AutomationWorkflowList: React.FC<AutomationWorkflowListProps> = ({
  workflows,
  isLoading,
  onRefresh,
  onWorkflowPress,
  ListHeaderComponent,
}) => {
  if (isLoading && workflows.length === 0) {
    return (
      <View style={styles.center}>
        <Loader />
      </View>
    );
  }

  return (
    <FlatList
      data={workflows}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <AutomationWorkflowCard workflow={item} onPress={onWorkflowPress} />
      )}
      contentContainerStyle={styles.list}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <EmptyState
          title="No Automations Found"
          description="Create your first automation workflow to start engaging with members automatically."
          icon="activity"
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

