import { useState, useCallback } from 'react';
import { WorkoutFeedbackRequest, WorkoutSession } from '../../domain';

export const useWorkoutFeedbackForm = () => {
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  const [formState, setFormState] = useState<WorkoutFeedbackRequest>({
    sessionId: '',
    overallSatisfaction: 5,
    workoutIntensity: 3,
    trainerRating: 5,
    equipmentQuality: 5,
    facilityRating: 5,
    recommendWorkout: 'yes',
    difficultyLevel: 'just-right',
    paceRating: 'just-right',
    bestAspects: [],
    areasForImprovement: [],
    comments: '',
    suggestions: '',
    energyAfterWorkout: 'high',
    likelyToReturn: 10,
    wouldRecommendTrainer: 'yes',
  });

  const openSheetForSession = useCallback((session: WorkoutSession) => {
    setSelectedSession(session);
    setFormState((prev) => ({
      ...prev,
      sessionId: session.id,
      overallSatisfaction: 5,
      workoutIntensity: 3,
      trainerRating: session.trainerName ? 5 : 0,
      equipmentQuality: 5,
      facilityRating: 5,
      recommendWorkout: 'yes',
      difficultyLevel: 'just-right',
      paceRating: 'just-right',
      bestAspects: [],
      areasForImprovement: [],
      comments: '',
      suggestions: '',
      energyAfterWorkout: 'high',
      likelyToReturn: 10,
      wouldRecommendTrainer: session.trainerName ? 'yes' : '',
    }));
    setIsSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    setIsSheetVisible(false);
  }, []);

  const updateField = useCallback(<K extends keyof WorkoutFeedbackRequest>(
    field: K,
    value: WorkoutFeedbackRequest[K]
  ) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const toggleArrayField = useCallback(
    (field: 'bestAspects' | 'areasForImprovement', item: string) => {
      setFormState((prev) => {
        const currentArray = prev[field] || [];
        if (currentArray.includes(item)) {
          return {
            ...prev,
            [field]: currentArray.filter((i) => i !== item),
          };
        } else {
          return {
            ...prev,
            [field]: [...currentArray, item],
          };
        }
      });
    },
    []
  );

  return {
    selectedSession,
    isSheetVisible,
    formState,
    openSheetForSession,
    closeSheet,
    updateField,
    toggleArrayField,
  };
};
