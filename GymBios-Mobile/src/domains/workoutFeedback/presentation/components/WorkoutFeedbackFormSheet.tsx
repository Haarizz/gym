import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { Spacing, BrandColors } from '@/core/theme';
import { StarRating } from './StarRating';
import { RatingSlider } from './RatingSlider';
import { FeedbackRadioGroup } from './FeedbackRadioGroup';
import { FeedbackCheckboxGroup } from './FeedbackCheckboxGroup';
import { FeedbackTextField } from './FeedbackTextField';
import { WorkoutFeedbackRequest, WorkoutSession } from '../../domain';
import { useSubmitWorkoutFeedback } from '../../hooks/useWorkoutFeedback';

interface WorkoutFeedbackFormSheetProps {
  visible: boolean;
  onClose: () => void;
  session: WorkoutSession | null;
  formState: WorkoutFeedbackRequest;
  updateField: <K extends keyof WorkoutFeedbackRequest>(field: K, value: WorkoutFeedbackRequest[K]) => void;
  toggleArrayField: (field: 'bestAspects' | 'areasForImprovement', item: string) => void;
}

export function WorkoutFeedbackFormSheet({
  visible,
  onClose,
  session,
  formState,
  updateField,
  toggleArrayField,
}: WorkoutFeedbackFormSheetProps) {
  const { mutate: submitFeedback, isPending } = useSubmitWorkoutFeedback();

  const handleSubmit = () => {
    submitFeedback(formState, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  if (!session) return null;

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Workout Feedback"
      subtitle={`For ${session.memberName}'s ${session.workoutType ? session.workoutType.replace('-', ' ') : 'Session'}`}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Typography variant="subtitle">Overall Satisfaction</Typography>
            <Typography variant="body" color="textSecondary" style={styles.helpText}>How satisfied was the member with their workout?</Typography>
            <StarRating
              rating={formState.overallSatisfaction || 0}
              onRatingChange={(v) => updateField('overallSatisfaction', v)}
              size="lg"
            />
          </View>

          <View style={styles.section}>
            <Typography variant="subtitle">Workout Intensity</Typography>
            <Typography variant="body" color="textSecondary" style={styles.helpText}>How intense was the workout?</Typography>
            <RatingSlider
              value={formState.workoutIntensity || 3}
              onValueChange={(v) => updateField('workoutIntensity', v)}
              min={1}
              max={5}
              minLabel="Too Easy"
              midLabel="Perfect"
              maxLabel="Very Hard"
            />
          </View>

          {session.trainerName && (
            <View style={styles.section}>
              <Typography variant="subtitle">Trainer Rating</Typography>
              <Typography variant="body" color="textSecondary" style={styles.helpText}>Rate {session.trainerName}'s performance</Typography>
              <StarRating
                rating={formState.trainerRating || 0}
                onRatingChange={(v) => updateField('trainerRating', v)}
                size="lg"
              />
            </View>
          )}

          <View style={styles.rowSection}>
            <View style={styles.halfSection}>
              <Typography variant="subtitle">Equipment Quality</Typography>
              <Typography variant="body" color="textSecondary" style={styles.helpText}>Rate condition</Typography>
              <StarRating
                rating={formState.equipmentQuality || 0}
                onRatingChange={(v) => updateField('equipmentQuality', v)}
                size="sm"
              />
            </View>
            <View style={styles.halfSection}>
              <Typography variant="subtitle">Facility Rating</Typography>
              <Typography variant="body" color="textSecondary" style={styles.helpText}>Rate cleanliness</Typography>
              <StarRating
                rating={formState.facilityRating || 0}
                onRatingChange={(v) => updateField('facilityRating', v)}
                size="sm"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Typography variant="subtitle">Would you recommend this workout?</Typography>
            <FeedbackRadioGroup
              options={[
                { label: 'Yes, definitely', value: 'yes' },
                { label: 'Maybe, with improvements', value: 'maybe' },
                { label: 'No, not recommended', value: 'no' },
              ]}
              value={formState.recommendWorkout}
              onChange={(v) => updateField('recommendWorkout', v)}
            />
          </View>

          <View style={styles.rowSection}>
            <View style={styles.halfSection}>
              <Typography variant="subtitle">Difficulty Level</Typography>
              <FeedbackRadioGroup
                options={[
                  { label: 'Too Easy', value: 'too-easy' },
                  { label: 'Just Right', value: 'just-right' },
                  { label: 'Too Hard', value: 'too-hard' },
                ]}
                value={formState.difficultyLevel}
                onChange={(v) => updateField('difficultyLevel', v)}
              />
            </View>
            <View style={styles.halfSection}>
              <Typography variant="subtitle">Pace Rating</Typography>
              <FeedbackRadioGroup
                options={[
                  { label: 'Too Slow', value: 'too-slow' },
                  { label: 'Just Right', value: 'just-right' },
                  { label: 'Too Fast', value: 'too-fast' },
                ]}
                value={formState.paceRating}
                onChange={(v) => updateField('paceRating', v)}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Typography variant="subtitle">What were the best aspects?</Typography>
            <FeedbackCheckboxGroup
              options={['music', 'energy', 'instruction', 'variety', 'challenge', 'community']}
              selected={formState.bestAspects || []}
              onToggle={(v) => toggleArrayField('bestAspects', v)}
            />
          </View>

          <View style={styles.section}>
            <Typography variant="subtitle">Areas for improvement</Typography>
            <FeedbackCheckboxGroup
              options={['timing', 'equipment', 'space', 'temperature', 'noise', 'cleanliness']}
              selected={formState.areasForImprovement || []}
              onToggle={(v) => toggleArrayField('areasForImprovement', v)}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Typography variant="subtitle">Additional Comments</Typography>
            <FeedbackTextField
              value={formState.comments || ''}
              onChangeText={(v) => updateField('comments', v)}
              placeholder="Tell us about your experience..."
            />
          </View>

          <View style={styles.section}>
            <Typography variant="subtitle">Suggestions for Improvement</Typography>
            <FeedbackTextField
              value={formState.suggestions || ''}
              onChangeText={(v) => updateField('suggestions', v)}
              placeholder="How can we make this workout better?"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Typography variant="subtitle">Energy Level After Workout</Typography>
            <FeedbackRadioGroup
              options={[
                { label: 'Low - Feeling tired', value: 'low' },
                { label: 'Medium - Feeling good', value: 'medium' },
                { label: 'High - Feeling energized', value: 'high' },
              ]}
              value={formState.energyAfterWorkout}
              onChange={(v) => updateField('energyAfterWorkout', v)}
            />
          </View>

          <View style={styles.section}>
            <Typography variant="subtitle">Likelihood to Return (1-10)</Typography>
            <RatingSlider
              value={formState.likelyToReturn || 10}
              onValueChange={(v) => updateField('likelyToReturn', v)}
              min={1}
              max={10}
              minLabel="Very Unlikely"
              maxLabel="Very Likely"
              midLabel={`${formState.likelyToReturn || 10}`}
            />
          </View>

          {session.trainerName && (
            <View style={styles.section}>
              <Typography variant="subtitle">Would recommend this trainer?</Typography>
              <FeedbackRadioGroup
                options={[
                  { label: 'Yes, definitely', value: 'yes' },
                  { label: 'Neutral', value: 'neutral' },
                  { label: "No, wouldn't recommend", value: 'no' },
                ]}
                value={formState.wouldRecommendTrainer}
                onChange={(v) => updateField('wouldRecommendTrainer', v)}
              />
            </View>
          )}

          <View style={styles.actions}>
            <Button variant="outline" onPress={onClose} style={styles.actionBtn}>
              Cancel
            </Button>
            <Button onPress={handleSubmit} loading={isPending} style={styles.actionBtn}>
              Submit
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  helpText: {
    marginBottom: Spacing.two,
    fontSize: 13,
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.six,
  },
  actionBtn: {
    flex: 1,
  },
});
