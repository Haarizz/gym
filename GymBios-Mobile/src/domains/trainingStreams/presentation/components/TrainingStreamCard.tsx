import { View, StyleSheet, Image, Alert } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Spacing } from '@/core/theme';
import { Card } from '@/shared/components/Card';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { formatDate } from '@/shared/components/DatePicker/utils';

import type { TrainingStream } from '../../domain/TrainingStream';
import {
  useStartTrainingStream,
  useEndTrainingStream,
  useJoinTrainingStream,
  useDeleteTrainingStream,
} from '../../hooks/useTrainingStreamActions';


interface TrainingStreamCardProps {
  stream: TrainingStream;
  onEdit?: (stream: TrainingStream) => void;
}

export function TrainingStreamCard({ stream, onEdit }: TrainingStreamCardProps) {
  const startMutation = useStartTrainingStream();
  const endMutation = useEndTrainingStream();
  const joinMutation = useJoinTrainingStream();
  const deleteMutation = useDeleteTrainingStream();

  const handleStart = () => startMutation.mutate(Number(stream.id));
  const handleEnd = () => endMutation.mutate(Number(stream.id));
  const handleJoin = () => joinMutation.mutate(Number(stream.id));

  const handleDelete = () => {
    Alert.alert('Delete Stream', 'Are you sure you want to delete this stream?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(Number(stream.id)) },
    ]);
  };

  return (
    <Card style={styles.card}>
      {stream.thumbnailUrl ? (
        <Image source={{ uri: stream.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={styles.placeholderThumbnail}>
          <Feather name="video" size={32} color={BrandColors.textSecondary} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <StatusBadge status={stream.status || 'UNKNOWN'} />
          <View style={styles.actionsRight}>
            {onEdit && (
              <Button variant="ghost" size="md" label="Edit" onPress={() => onEdit(stream)} style={styles.iconButton} />
            )}
            <Button variant="ghost" size="md" label="Delete" onPress={handleDelete} style={styles.iconButton} />
          </View>
        </View>

        <Typography variant="subtitle" style={styles.title}>
          {stream.title}
        </Typography>

        {stream.description ? (
          <Typography variant="bodySmall" color="textSecondary" numberOfLines={2}>
            {stream.description}
          </Typography>
        ) : null}

        <View style={styles.metadata}>
          {stream.instructorName ? (
            <View style={styles.metaItem}>
              <Feather name="user" size={14} color={BrandColors.textSecondary} />
              <Typography variant="caption" color="textSecondary">{stream.instructorName}</Typography>
            </View>
          ) : null}

          {stream.category ? (
            <View style={styles.metaItem}>
              <Feather name="tag" size={14} color={BrandColors.textSecondary} />
              <Typography variant="caption" color="textSecondary">{stream.category}</Typography>
            </View>
          ) : null}

          {stream.scheduledTime ? (
            <View style={styles.metaItem}>
              <Feather name="calendar" size={14} color={BrandColors.textSecondary} />
              <Typography variant="caption" color="textSecondary">
                {formatDate(new Date(stream.scheduledTime), 'MMM d, h:mm a')}
              </Typography>
            </View>
          ) : null}

          {stream.views !== undefined ? (
            <View style={styles.metaItem}>
              <Feather name="eye" size={14} color={BrandColors.textSecondary} />
              <Typography variant="caption" color="textSecondary">{stream.views}</Typography>
            </View>
          ) : null}
        </View>

        <View style={styles.actionButtons}>
          {stream.status === 'SCHEDULED' && (
            <Button label="Start Stream" onPress={handleStart} loading={startMutation.isPending} style={styles.flex1} />
          )}
          {stream.status === 'LIVE' && (
            <>
              <Button label="Join" variant="secondary" onPress={handleJoin} loading={joinMutation.isPending} style={styles.flex1} />
              <Button label="End Stream" variant="primary" onPress={handleEnd} loading={endMutation.isPending} style={{...styles.flex1, backgroundColor: '#ef4444'}} />
            </>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#f1f5f9',
  },
  placeholderThumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconButton: {
    paddingHorizontal: Spacing.two,
    minHeight: 32,
  },
  title: {
    marginTop: Spacing.one,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  flex1: {
    flex: 1,
  },
});
