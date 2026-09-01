import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import type { MemberFeedbackPayload } from '../../../domain/MemberFeedback';

interface PostWorkoutFeedbackSheetProps {
  visible: boolean;
  attendanceId: number;
  memberName?: string;
  isSubmitting?: boolean;
  onSubmit: (payload: MemberFeedbackPayload) => void;
  onClose: () => void;
}

const TOTAL_STEPS = 6;

const STEP_TITLES = [
  "How was today's workout? ⭐",
  "Let's rate the equipment & facility",
  'How did the fit and pace feel?',
  'What stood out today?',
  'Energy after the session',
  'Any final notes?',
];

const OVERALL_CAPTIONS: Record<number, string> = {
  1: 'Not great',
  2: 'Could be better',
  3: 'Pretty good',
  4: 'Really enjoyed it',
  5: 'Loved it!',
};

const INTENSITY_LABELS: Record<number, string> = {
  1: 'Too easy',
  2: 'Easy',
  3: 'Perfect',
  4: 'Hard',
  5: 'Very hard',
};

const ENERGY_OPTIONS = [
  { value: 'low', emoji: '😮‍💨', label: 'Low' },
  { value: 'medium', emoji: '🙂', label: 'Good' },
  { value: 'high', emoji: '⚡️', label: 'Energized' },
];

const BEST_ASPECTS = [
  'Music',
  'Energy',
  'Instruction',
  'Variety',
  'Challenge',
  'Community',
];

const IMPROVE_AREAS = [
  'Timing',
  'Equipment',
  'Space',
  'Temperature',
  'Noise',
  'Cleanliness',
];

export function PostWorkoutFeedbackSheet({
  visible,
  attendanceId,
  isSubmitting = false,
  onSubmit,
  onClose,
}: PostWorkoutFeedbackSheetProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showToast, setShowToast] = useState(false);

  // Form State
  const [overallSatisfaction, setOverallSatisfaction] = useState<number>(0);
  const [workoutIntensity, setWorkoutIntensity] = useState<number>(3);
  const [equipmentQuality, setEquipmentQuality] = useState<number>(0);
  const [facilityRating, setFacilityRating] = useState<number>(0);
  const [recommendWorkout, setRecommendWorkout] = useState<string | null>(null);
  const [difficultyLevel, setDifficultyLevel] = useState<string | null>(null);
  const [paceRating, setPaceRating] = useState<string | null>(null);
  const [bestAspects, setBestAspects] = useState<string[]>([]);
  const [areasForImprovement, setAreasForImprovement] = useState<string[]>([]);
  const [energyAfterWorkout, setEnergyAfterWorkout] = useState<string | null>(null);
  const [likelyToReturn, setLikelyToReturn] = useState<number>(8);
  const [comments, setComments] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string>('');

  // Step Validation
  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 1:
        return overallSatisfaction > 0;
      case 2:
        return equipmentQuality > 0 && facilityRating > 0;
      case 3:
        return Boolean(recommendWorkout && difficultyLevel && paceRating);
      case 4:
        return true; // Optional multi-select
      case 5:
        return Boolean(energyAfterWorkout);
      case 6:
        return true; // Optional notes
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    const payload: MemberFeedbackPayload = {
      attendanceId,
      overallSatisfaction,
      workoutIntensity,
      equipmentQuality,
      facilityRating,
      recommendWorkout: recommendWorkout || 'Yes, definitely',
      difficultyLevel: difficultyLevel || 'Just right',
      paceRating: paceRating || 'Just right',
      bestAspects,
      areasForImprovement,
      comments: comments.trim() || undefined,
      suggestions: suggestions.trim() || undefined,
      energyAfterWorkout: energyAfterWorkout || 'medium',
      likelyToReturn,
    };

    setShowToast(true);
    onSubmit(payload);
  };

  const toggleMultiSelect = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}}
    >
      <View style={styles.scrim}>
        <View style={styles.sheetContainer}>
          {/* Toast Notification */}
          {showToast && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>✓ Saved</Text>
            </View>
          )}

          {/* Grabber Bar */}
          <View style={styles.grabberZone}>
            <View style={styles.grabber} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>
              STEP {currentStep} OF {TOTAL_STEPS}
            </Text>
            <Text style={styles.title}>{STEP_TITLES[currentStep - 1]}</Text>
            <Text style={styles.subtitle}>Tap to continue your feedback</Text>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
              const stepIndex = idx + 1;
              const isDone = stepIndex < currentStep;
              const isCurrent = stepIndex === currentStep;
              return (
                <View
                  key={idx}
                  style={[
                    styles.progressBar,
                    isDone && styles.progressBarDone,
                    isCurrent && styles.progressBarCurrent,
                  ]}
                />
              );
            })}
          </View>

          {/* Scrollable Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* STEP 1: Overall Rating & Intensity */}
            {currentStep === 1 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepHeading}>How was today's workout?</Text>
                <Text style={styles.hint}>Your overall take on the session.</Text>

                {/* Big Stars */}
                <View style={styles.starsBigRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setOverallSatisfaction(star)}
                      style={styles.starButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Rate ${star} star`}
                    >
                      <Feather
                        name="star"
                        size={40}
                        color={star <= overallSatisfaction ? '#F0A93C' : '#DDD6C8'}
                      />
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.caption}>
                  {overallSatisfaction > 0 ? OVERALL_CAPTIONS[overallSatisfaction] : ' '}
                </Text>

                {/* Intensity */}
                <Text style={[styles.groupLabel, { marginTop: 24 }]}>INTENSITY</Text>
                <View style={styles.steppedSelector}>
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isSelected = workoutIntensity === level;
                    return (
                      <Pressable
                        key={level}
                        onPress={() => setWorkoutIntensity(level)}
                        style={[
                          styles.stepPill,
                          isSelected && styles.stepPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepPillText,
                            isSelected && styles.stepPillTextSelected,
                          ]}
                        >
                          {level}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.rangeLabels}>
                  <Text style={styles.rangeEnd}>Too easy</Text>
                  <Text style={styles.rangeCurrent}>
                    {INTENSITY_LABELS[workoutIntensity] || 'Perfect'}
                  </Text>
                  <Text style={styles.rangeEnd}>Very hard</Text>
                </View>
              </View>
            )}

            {/* STEP 2: Equipment & Facility */}
            {currentStep === 2 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepHeading}>Equipment & facility</Text>
                <Text style={styles.hint}>Rate the condition of what you used today.</Text>

                {/* Equipment Card */}
                <View style={styles.miniRateCard}>
                  <View style={styles.miniRateInfo}>
                    <Text style={styles.miniRateName}>Equipment</Text>
                    <Text style={styles.miniRateSub}>Condition & availability</Text>
                  </View>
                  <View style={styles.starsMiniRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setEquipmentQuality(star)}
                        style={styles.miniStarButton}
                      >
                        <Feather
                          name="star"
                          size={22}
                          color={star <= equipmentQuality ? '#F0A93C' : '#DDD6C8'}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Facility Card */}
                <View style={styles.miniRateCard}>
                  <View style={styles.miniRateInfo}>
                    <Text style={styles.miniRateName}>Facility</Text>
                    <Text style={styles.miniRateSub}>Cleanliness & environment</Text>
                  </View>
                  <View style={styles.starsMiniRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setFacilityRating(star)}
                        style={styles.miniStarButton}
                      >
                        <Feather
                          name="star"
                          size={22}
                          color={star <= facilityRating ? '#F0A93C' : '#DDD6C8'}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* STEP 3: Fit & Pacing */}
            {currentStep === 3 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepHeading}>Fit & pacing</Text>
                <Text style={styles.hint}>
                  Would you recommend this, and how did it feel?
                </Text>

                <Text style={styles.groupLabel}>RECOMMEND THIS WORKOUT?</Text>
                <View style={styles.chipRow}>
                  {['Yes, definitely', 'Maybe', 'No'].map((opt) => {
                    const isSelected = recommendWorkout === opt;
                    const isWarn = isSelected && opt === 'No';
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setRecommendWorkout(opt)}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                          isWarn && styles.chipWarn,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.groupLabel}>DIFFICULTY</Text>
                <View style={styles.segmentedContainer}>
                  {['Too easy', 'Just right', 'Too hard'].map((opt) => {
                    const isSelected = difficultyLevel === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setDifficultyLevel(opt)}
                        style={[
                          styles.segmentItem,
                          isSelected && styles.segmentItemSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            isSelected && styles.segmentTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.groupLabel}>PACE</Text>
                <View style={styles.segmentedContainer}>
                  {['Too slow', 'Just right', 'Too fast'].map((opt) => {
                    const isSelected = paceRating === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setPaceRating(opt)}
                        style={[
                          styles.segmentItem,
                          isSelected && styles.segmentItemSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            isSelected && styles.segmentTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* STEP 4: What Stood Out */}
            {currentStep === 4 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepHeading}>What stood out?</Text>
                <Text style={styles.hint}>
                  Tap all that apply — good and needs-work.
                </Text>

                <Text style={styles.groupLabel}>BEST ASPECTS</Text>
                <View style={styles.chipRow}>
                  {BEST_ASPECTS.map((opt) => {
                    const isSelected = bestAspects.includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() =>
                          toggleMultiSelect(bestAspects, setBestAspects, opt)
                        }
                        style={[styles.chip, isSelected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.groupLabel}>COULD IMPROVE</Text>
                <View style={styles.chipRow}>
                  {IMPROVE_AREAS.map((opt) => {
                    const isSelected = areasForImprovement.includes(opt);
                    return (
                      <Pressable
                        key={opt}
                        onPress={() =>
                          toggleMultiSelect(
                            areasForImprovement,
                            setAreasForImprovement,
                            opt
                          )
                        }
                        style={[styles.chip, isSelected && styles.chipSelected]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {opt}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* STEP 5: Energy & Return */}
            {currentStep === 5 && (
              <View style={styles.stepContainer}>
                <Text style={styles.stepHeading}>Energy & return</Text>
                <Text style={styles.hint}>How did you leave feeling?</Text>

                <View style={styles.emojiRow}>
                  {ENERGY_OPTIONS.map((item) => {
                    const isSelected = energyAfterWorkout === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => setEnergyAfterWorkout(item.value)}
                        style={[
                          styles.emojiCard,
                          isSelected && styles.emojiCardSelected,
                        ]}
                      >
                        <Text style={styles.emojiIcon}>{item.emoji}</Text>
                        <Text
                          style={[
                            styles.emojiLabel,
                            isSelected && styles.emojiLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.groupLabel}>LIKELIHOOD TO BOOK AGAIN</Text>
                <View style={styles.steppedSelector}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                    const isSelected = likelyToReturn === score;
                    return (
                      <Pressable
                        key={score}
                        onPress={() => setLikelyToReturn(score)}
                        style={[
                          styles.scorePill,
                          isSelected && styles.stepPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.scorePillText,
                            isSelected && styles.stepPillTextSelected,
                          ]}
                        >
                          {score}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.rangeLabels}>
                  <Text style={styles.rangeEnd}>Unlikely</Text>
                  <Text style={styles.rangeCurrent}>{likelyToReturn} / 10</Text>
                  <Text style={styles.rangeEnd}>Very likely</Text>
                </View>
              </View>
            )}

            {/* STEP 6: Comments & Suggestions */}
            {currentStep === 6 && (
              <View style={styles.stepContainer}>
                <View style={styles.optionalHeaderRow}>
                  <Text style={styles.stepHeading}>Anything else?</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={styles.optionalBadgeText}>Optional</Text>
                  </View>
                </View>
                <Text style={styles.hint}>Skip this if there's nothing to add.</Text>

                <Text style={styles.groupLabel}>COMMENTS</Text>
                <TextInput
                  value={comments}
                  onChangeText={setComments}
                  placeholder="Tell us about the experience..."
                  placeholderTextColor="#9C978D"
                  multiline
                  style={styles.textArea}
                  textAlignVertical="top"
                />

                <Text style={styles.groupLabel}>SUGGESTIONS</Text>
                <TextInput
                  value={suggestions}
                  onChangeText={setSuggestions}
                  placeholder="How can we make this better?"
                  placeholderTextColor="#9C978D"
                  multiline
                  style={styles.textArea}
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Navigation */}
          <View style={styles.footer}>
            {currentStep > 1 ? (
              <Pressable
                onPress={handleBack}
                disabled={isSubmitting}
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.placeholderBack} />
            )}

            <Pressable
              onPress={handleNext}
              disabled={!isCurrentStepValid() || isSubmitting}
              style={[
                styles.primaryButton,
                currentStep === TOTAL_STEPS && styles.primaryButtonDone,
                (!isCurrentStepValid() || isSubmitting) && styles.buttonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {currentStep === TOTAL_STEPS ? 'Submit feedback' : 'Continue'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 14, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '88%',
    paddingBottom: 24,
    shadowColor: '#14120E',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },
  grabberZone: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#DDD6C8',
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E7C6B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1C1B1A',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B6660',
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    backgroundColor: '#ECE8E2',
  },
  progressBarDone: {
    backgroundColor: '#0E7C6B',
  },
  progressBarCurrent: {
    backgroundColor: '#C9821E',
  },
  body: {
    maxHeight: 440,
  },
  bodyContent: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  stepContainer: {
    paddingTop: 4,
  },
  stepHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1B1A',
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 14,
    color: '#6B6660',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 20,
  },
  starsBigRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 12,
  },
  starButton: {
    padding: 4,
  },
  caption: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#C9821E',
    minHeight: 20,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B6660',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 10,
  },
  steppedSelector: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  stepPill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F7F5F1',
    borderWidth: 1.5,
    borderColor: '#ECE8E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPillSelected: {
    backgroundColor: '#0E7C6B',
    borderColor: '#0E7C6B',
  },
  stepPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1B1A',
  },
  stepPillTextSelected: {
    color: '#FFFFFF',
  },
  scorePill: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F7F5F1',
    borderWidth: 1,
    borderColor: '#ECE8E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1B1A',
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeEnd: {
    fontSize: 12,
    color: '#6B6660',
  },
  rangeCurrent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1B1A',
  },
  miniRateCard: {
    backgroundColor: '#F7F5F1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniRateInfo: {
    flex: 1,
  },
  miniRateName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1B1A',
  },
  miniRateSub: {
    fontSize: 12,
    color: '#6B6660',
    marginTop: 2,
  },
  starsMiniRow: {
    flexDirection: 'row',
    gap: 4,
  },
  miniStarButton: {
    padding: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: '#ECE8E2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  chipSelected: {
    backgroundColor: '#0E7C6B',
    borderColor: '#0E7C6B',
  },
  chipWarn: {
    backgroundColor: '#E4633F',
    borderColor: '#E4633F',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1B1A',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7F5F1',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  segmentItemSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6660',
  },
  segmentTextSelected: {
    color: '#1C1B1A',
    fontWeight: '700',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
  },
  emojiCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ECE8E2',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  emojiCardSelected: {
    borderColor: '#0E7C6B',
    backgroundColor: '#E3F2EE',
  },
  emojiIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emojiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B6660',
  },
  emojiLabelSelected: {
    color: '#0E7C6B',
    fontWeight: '700',
  },
  optionalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionalBadge: {
    backgroundColor: '#F7F5F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6660',
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#ECE8E2',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 84,
    backgroundColor: '#F7F5F1',
    color: '#1C1B1A',
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECE8E2',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#F7F5F1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBack: {
    flex: 1,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B6660',
  },
  primaryButton: {
    flex: 2.2,
    backgroundColor: '#1C1B1A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDone: {
    backgroundColor: '#0E7C6B',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toast: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#1C1B1A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    zIndex: 100,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
