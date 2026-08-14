import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card } from '@/shared/components/Card';
import { Avatar } from '@/shared/components/Avatar';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing } from '@/core/theme';
import { WorkoutFeedback } from '../../domain';
import { format } from 'date-fns';
import { StarRating } from './StarRating';

interface RecentFeedbackCardProps {
  feedback: WorkoutFeedback;
  onPress: (feedback: WorkoutFeedback) => void;
}

export function RecentFeedbackCard({ feedback, onPress }: RecentFeedbackCardProps) {
  return (
    <Pressable onPress={() => onPress(feedback)} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Avatar name={feedback.memberName} size="md" />
          <View style={styles.headerText}>
            <Typography variant="subtitle">
              {feedback.memberName}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {(() => {
                const dateStr = feedback.submittedAt || (feedback as any).submitted_at;
                const dateObj = dateStr ? new Date(dateStr) : null;
                return dateObj && !isNaN(dateObj.getTime())
                  ? format(dateObj, 'MMM dd, HH:mm')
                  : 'Date unknown';
              })()}
            </Typography>
          </View>
          <View style={styles.badges}>
            {feedback.flaggedForReview && (
              <View style={[styles.badge, styles.badgeRed]}>
                <Typography variant="caption" style={styles.badgeTextRed}>Flagged</Typography>
              </View>
            )}
            {feedback.followUpRequired && (
              <View style={[styles.badge, styles.badgeYellow]}>
                <Typography variant="caption" style={styles.badgeTextYellow}>Follow-up</Typography>
              </View>
            )}
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Typography variant="body" color="textSecondary">Workout</Typography>
            <View style={styles.outlineBadge}>
              <Typography variant="caption" style={styles.outlineBadgeText}>
                {String(feedback.workoutType || (feedback as any).workout_type || '').replace('-', ' ')}
              </Typography>
            </View>
          </View>
          {feedback.trainerName && (
            <View style={styles.detailRow}>
              <Typography variant="body" color="textSecondary">Trainer</Typography>
              <Typography variant="body">{feedback.trainerName}</Typography>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Typography variant="body" color="textSecondary">Overall</Typography>
            <StarRating rating={feedback.overallSatisfaction || 0} size="sm" readonly />
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRed: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextRed: {
    color: '#DC2626',
    fontWeight: '600',
  },
  badgeYellow: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextYellow: {
    color: '#D97706',
    fontWeight: '600',
  },
  detailsContainer: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BrandColors.neutral[200],
    backgroundColor: BrandColors.screenBackground,
  },
  outlineBadgeText: {
    textTransform: 'capitalize',
  },
});
