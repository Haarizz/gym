import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components/Typography';
import { Spacing, BrandColors } from '@/core/theme';
import { WorkoutFeedback } from '../../domain';
import { StarRating } from './StarRating';

interface WorkoutFeedbackDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  feedback: WorkoutFeedback | null;
}

export function WorkoutFeedbackDetailsSheet({
  visible,
  onClose,
  feedback,
}: WorkoutFeedbackDetailsSheetProps) {
  if (!feedback) return null;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Feedback Details"
      subtitle={`${feedback.memberName}'s ${feedback.workoutType ? feedback.workoutType.replace('-', ' ') : 'Session'}`}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Typography variant="subtitle">Overall Satisfaction</Typography>
          <StarRating rating={feedback.overallSatisfaction || 0} size="md" readonly />
        </View>

        <View style={styles.rowSection}>
          <View style={styles.halfSection}>
            <Typography variant="subtitle">Intensity</Typography>
            <Typography variant="body">{feedback.workoutIntensity}/5</Typography>
          </View>
          <View style={styles.halfSection}>
            <Typography variant="subtitle">Equipment</Typography>
            <Typography variant="body">{feedback.equipmentQuality}/5</Typography>
          </View>
        </View>

        <View style={styles.rowSection}>
          <View style={styles.halfSection}>
            <Typography variant="subtitle">Facility</Typography>
            <Typography variant="body">{feedback.facilityRating}/5</Typography>
          </View>
          {feedback.trainerName && (
            <View style={styles.halfSection}>
              <Typography variant="subtitle">Trainer ({feedback.trainerName})</Typography>
              <Typography variant="body">{feedback.trainerRating}/5</Typography>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Typography variant="subtitle">Best Aspects</Typography>
          <Typography variant="body" style={styles.capitalize}>{feedback.bestAspects?.join(', ') || 'None selected'}</Typography>
        </View>

        <View style={styles.section}>
          <Typography variant="subtitle">Areas for Improvement</Typography>
          <Typography variant="body" style={styles.capitalize}>{feedback.areasForImprovement?.join(', ') || 'None selected'}</Typography>
        </View>

        <View style={styles.divider} />

        {!!feedback.comments && (
          <View style={styles.section}>
            <Typography variant="subtitle">Comments</Typography>
            <Typography variant="body" color="textSecondary">{feedback.comments}</Typography>
          </View>
        )}

        {!!feedback.suggestions && (
          <View style={styles.section}>
            <Typography variant="subtitle">Suggestions</Typography>
            <Typography variant="body" color="textSecondary">{feedback.suggestions}</Typography>
          </View>
        )}
        
        {!!feedback.trainerNotes && (
          <View style={styles.section}>
            <Typography variant="subtitle">Trainer Notes</Typography>
            <Typography variant="body" color="textSecondary">{feedback.trainerNotes}</Typography>
          </View>
        )}

        <View style={{ height: Spacing.four }} />
      </ScrollView>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.four,
  },
  rowSection: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.four,
  },
  halfSection: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: BrandColors.neutral[200],
    marginVertical: Spacing.md,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
});
