import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Typography } from '@/shared/components/Typography';
import { Surface } from '@/shared/components/Surface';
import { Badge } from '@/shared/components/Badge';
import { Spacing } from '@/core/theme';
import { AutomationWorkflow } from '../../domain/types';
import { useToggleAutomationStatus, useRunAutomation } from '../../hooks/useAutomationActions';
import Feather from '@expo/vector-icons/Feather';

interface AutomationWorkflowCardProps {
  workflow: AutomationWorkflow;
  onPress: (workflow: AutomationWorkflow) => void;
}

export const AutomationWorkflowCard: React.FC<AutomationWorkflowCardProps> = ({ workflow, onPress }) => {
  const { mutate: toggleStatus } = useToggleAutomationStatus(workflow.id);
  const { mutate: runWorkflow } = useRunAutomation(workflow.id);

  const handleAction = () => {
    if (workflow.status === 'active' || workflow.status === 'paused') {
      toggleStatus();
    }
  };

  const getStatusColor = () => {
    switch (workflow.status) {
      case 'active': return 'success';
      case 'paused': return 'muted';
      case 'error': return 'default'; // no error tone in badge yet
      default: return 'default';
    }
  };

  return (
    <Surface style={styles.card}>
      <TouchableOpacity style={styles.content} onPress={() => onPress(workflow)}>
        <View style={styles.header}>
          <Typography variant="body" style={styles.title} numberOfLines={1}>
            {workflow.name}
          </Typography>
          <Badge label={workflow.status.toUpperCase()} tone={getStatusColor()} />
        </View>

        <Typography variant="bodySmall" color="textSecondary" numberOfLines={2} style={styles.description}>
          {workflow.description || `Trigger: ${workflow.triggerType} | Action: ${workflow.actionType}`}
        </Typography>

        <View style={styles.stats}>
          <Typography variant="bodySmall" color="textSecondary">
            Runs: {workflow.totalRuns}
          </Typography>
          <Typography variant="bodySmall" color="textSecondary">
            Engaged: {workflow.membersEngaged}
          </Typography>
        </View>
      </TouchableOpacity>
      
      {(workflow.status === 'active' || workflow.status === 'paused') && (
        <TouchableOpacity style={styles.actionButton} onPress={handleAction}>
          {workflow.status === 'active' ? (
            <Feather name="pause" size={20} color="#49587a" />
          ) : (
            <Feather name="play" size={20} color="#49587a" />
          )}
        </TouchableOpacity>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: Spacing.md,
    marginBottom: Spacing.two,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    flex: 1,
    marginRight: Spacing.two,
    fontWeight: '600',
  },
  description: {
    marginBottom: Spacing.two,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    padding: Spacing.two,
    marginLeft: Spacing.two,
    borderRadius: 8,
  },
});


