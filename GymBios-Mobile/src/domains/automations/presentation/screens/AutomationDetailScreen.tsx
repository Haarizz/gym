import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Typography } from '@/shared/components/Typography';
import { Surface } from '@/shared/components/Surface';
import { Badge } from '@/shared/components/Badge';
import { Loader } from '@/shared/components/Loader';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { AppHeader } from '@/shared/components/AppHeader';
import { AutomationExecutionLogList } from '../components/AutomationExecutionLogList';
import { useAutomation, useAutomationLogs } from '../../hooks/useAutomations';
import { useDeleteAutomation, useToggleAutomationStatus, useRunAutomation } from '../../hooks/useAutomationActions';
import { Spacing } from '@/core/theme';
import Feather from '@expo/vector-icons/Feather';

export const AutomationDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const automationId = Number(id);
  const router = useRouter();

  const { data: workflow, isLoading: isLoadingWorkflow } = useAutomation(automationId);
  const { data: logs = [], isLoading: isLoadingLogs, refetch: refetchLogs } = useAutomationLogs(automationId);
  const { mutate: deleteAutomation } = useDeleteAutomation(automationId);
  const { mutate: toggleStatus } = useToggleAutomationStatus(automationId);
  const { mutate: runAutomation } = useRunAutomation(automationId);

  const handleDelete = () => {
    deleteAutomation(undefined, {
      onSuccess: () => {
        router.back();
      },
    });
  };

  const handleAction = () => {
    if (workflow?.status === 'active') {
      toggleStatus();
    } else if (workflow?.status === 'paused') {
      runAutomation();
    }
  };

  if (isLoadingWorkflow) {
    return (
      <View style={styles.center}>
        <Loader />
      </View>
    );
  }

  if (!workflow) {
    return (
      <View style={styles.center}>
        <Typography variant="body">Workflow not found</Typography>
      </View>
    );
  }

  return (
    <ScreenLayout>
      <AppHeader 
        title={workflow.name} 
        subtitle="Workflow Details"
        colors={['#327f74', '#2a6b62']} 
        onBack={() => router.back()} 
      />
      <ScrollView style={styles.content}>
        <Surface style={styles.summaryCard}>
          <View style={styles.headerRow}>
            <Typography variant="subtitle">Details</Typography>
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleAction} style={styles.iconButton}>
                {workflow.status === 'active' ? (
                  <Feather name="pause" size={20} color="#49587a" />
                ) : (
                  <Feather name="play" size={20} color="#49587a" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
                <Feather name="trash-2" size={20} color="#d4183d" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ marginBottom: Spacing.two }}>
            <Badge label={workflow.status.toUpperCase()} />
          </View>
          
          <Typography variant="body" color="textSecondary" style={styles.description}>
            {workflow.description || 'No description provided.'}
          </Typography>
          
          <View style={styles.detailRow}>
            <Typography variant="bodySmallBold">Trigger:</Typography>
            <Typography variant="bodySmall">{workflow.triggerType}</Typography>
          </View>
          <View style={styles.detailRow}>
            <Typography variant="bodySmallBold">Action:</Typography>
            <Typography variant="bodySmall">{workflow.actionType}</Typography>
          </View>
          <View style={styles.detailRow}>
            <Typography variant="bodySmallBold">Frequency:</Typography>
            <Typography variant="bodySmall">{workflow.frequency}</Typography>
          </View>
        </Surface>

        <Typography variant="title" style={styles.logsTitle}>
          Execution Logs
        </Typography>
        
        <AutomationExecutionLogList 
          logs={logs}
          isLoading={isLoadingLogs}
          onRefresh={refetchLogs}
        />
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.md,
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    padding: Spacing.two,
  },
  description: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  logsTitle: {
    marginBottom: Spacing.md,
  },
});

