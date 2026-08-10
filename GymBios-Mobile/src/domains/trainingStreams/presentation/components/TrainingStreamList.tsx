import { View, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { EmptyState } from '@/shared/components/EmptyState';
import { Loader } from '@/shared/components/Loader';

import type { TrainingStream } from '../../domain/TrainingStream';
import { TrainingStreamCard } from './TrainingStreamCard';

interface TrainingStreamListProps {
  streams: TrainingStream[];
  loading: boolean;
  error: Error | null;
  onEdit?: (stream: TrainingStream) => void;
  onCreateAction?: () => void;
}

export function TrainingStreamList({
  streams,
  loading,
  error,
  onEdit,
  onCreateAction,
}: TrainingStreamListProps) {
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={32} color="#ef4444" />
        <Typography variant="body" color="error">
          Failed to load streams
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {error.message}
        </Typography>
      </View>
    );
  }

  if (loading && streams.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Loader />
      </View>
    );
  }

  if (streams.length === 0) {
    return (
      <EmptyState
        icon="video"
        title="No streams found"
        description="There are no streams matching your criteria."
        buttonLabel={onCreateAction ? 'Create Stream' : undefined}
        onPress={onCreateAction}
      />
    );
  }

  return (
    <View style={styles.list}>
      {streams.map((stream) => (
        <TrainingStreamCard key={stream.id} stream={stream} onEdit={onEdit} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  loadingContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
