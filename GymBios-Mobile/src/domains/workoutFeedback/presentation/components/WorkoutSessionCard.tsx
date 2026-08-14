import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card } from '@/shared/components/Card';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing } from '@/core/theme';
import { WorkoutSession } from '../../domain';
import { format, isValid } from 'date-fns';

interface WorkoutSessionCardProps {
  session: WorkoutSession;
  onPress: (session: WorkoutSession) => void;
  isSelected?: boolean;
}

export function WorkoutSessionCard({ session, onPress, isSelected }: WorkoutSessionCardProps) {
  return (
    <Pressable onPress={() => onPress(session)} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Card style={[styles.card, isSelected && styles.cardSelected]}>
        <View style={styles.header}>
          <Avatar name={session.memberName} size="md" />
          <View style={styles.headerText}>
            <Typography variant="subtitle">
              {session.memberName}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              ID: {session.memberId}
            </Typography>
          </View>
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Typography variant="body" color="textSecondary">Workout Type</Typography>
            <View style={styles.badge}>
              <Typography variant="caption" style={styles.badgeText}>
                {session.workoutType ? session.workoutType.replace('-', ' ') : 'N/A'}
              </Typography>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Typography variant="body" color="textSecondary">Duration</Typography>
            <Typography variant="body">{session.duration} mins</Typography>
          </View>
          
          <View style={styles.detailRow}>
            <Typography variant="body" color="textSecondary">Time</Typography>
            <Typography variant="body">
              {session.startTime && isValid(new Date(session.startTime))
                ? format(new Date(session.startTime), 'HH:mm')
                : 'N/A'}
            </Typography>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: Spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: BrandColors.teal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerText: {
    marginLeft: Spacing.md,
  },
  detailsContainer: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BrandColors.neutral[200],
    backgroundColor: BrandColors.screenBackground,
  },
  badgeText: {
    textTransform: 'capitalize',
  }
});
