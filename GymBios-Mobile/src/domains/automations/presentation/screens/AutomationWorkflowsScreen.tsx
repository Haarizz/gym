import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AutomationWorkflowList } from '../components/AutomationWorkflowList';
import { useAutomations } from '../../hooks/useAutomations';
import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';
import { AutomationWorkflow } from '../../domain/types';
import { Button } from '@/shared/components/Button';

export const AutomationWorkflowsScreen = () => {
  const router = useRouter();
  const theme = useTheme();
  const { data: workflows = [], isLoading, refetch } = useAutomations();

  const handleWorkflowPress = (workflow: AutomationWorkflow) => {
    router.push(`/(admin)/automations/${workflow.id}`);
  };

  const handleCreateNew = () => {
    router.push('/(admin)/automations/create');
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <View style={styles.titleTextContainer}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>
            Workflows
          </Text>
          <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
            Manage your automated workflows
          </Text>
        </View>

        <Button
          label="+ Create"
          size="md"
          onPress={handleCreateNew}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AutomationWorkflowList
        workflows={workflows}
        isLoading={isLoading}
        onRefresh={refetch}
        onWorkflowPress={handleWorkflowPress}
        ListHeaderComponent={renderHeader()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.two,
    paddingHorizontal: Spacing.md,
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: Spacing.two,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
