import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Typography } from '@/shared/components/Typography';
import { Surface } from '@/shared/components/Surface';
import { Badge } from '@/shared/components/Badge';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';
import { AutomationExecutionLog } from '../../domain/types';
import { Spacing } from '@/core/theme';
import { useTheme } from '@/core/hooks';

interface AutomationExecutionLogListProps {
  logs: AutomationExecutionLog[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const AutomationExecutionLogList: React.FC<AutomationExecutionLogListProps> = ({
  logs,
  isLoading,
  onRefresh,
}) => {
  const theme = useTheme();

  const getStatusColor = (status: string): "success" | "muted" | "default" => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'default';
      case 'skipped': return 'muted';
      default: return 'default';
    }
  };

  if (isLoading && logs.length === 0) {
    return (
      <View style={styles.center}>
        <Loader />
      </View>
    );
  }

  return (
    <FlatList
      data={logs}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <Surface style={styles.card}>
          <View style={styles.header}>
            <Typography variant="bodySmallBold">
              {new Date(item.ranAt).toLocaleString()}
            </Typography>
            <Badge label={item.status.toUpperCase()} tone={getStatusColor(item.status)} />
          </View>

          <View style={styles.details}>
            <Typography variant="bodySmall" color="textSecondary">
              Source: {item.triggerSource}
            </Typography>
            <Typography variant="bodySmall" color="textSecondary">
              Matched: {item.matchedCount} | Processed: {item.processedCount}
            </Typography>
          </View>

          {item.errorMessage && (
            <View style={styles.errorContainer}>
              <Typography variant="bodySmall" color="error">
                {item.errorMessage}
              </Typography>
            </View>
          )}
        </Surface>
      )}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <EmptyState
          title="No Logs Available"
          description="This automation has not run yet."
          icon="clock"
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
  card: {
    padding: Spacing.md,
    marginBottom: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorContainer: {
    marginTop: Spacing.two,
    padding: Spacing.two,
    backgroundColor: '#ffe5e5', // Light red background for error
    borderRadius: 4,
  },
});

