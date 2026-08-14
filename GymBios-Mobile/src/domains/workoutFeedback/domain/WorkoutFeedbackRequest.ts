export interface WorkoutFeedbackRequest {
  sessionId: string;
  
  overallSatisfaction: number | null;
  workoutIntensity: number | null;
  trainerRating: number | null;
  equipmentQuality: number | null;
  facilityRating: number | null;

  recommendWorkout: string | null;
  difficultyLevel: string | null;
  paceRating: string | null;

  bestAspects: string[] | null;
  areasForImprovement: string[] | null;

  comments: string | null;
  suggestions: string | null;

  energyAfterWorkout: string | null;
  likelyToReturn: number | null;
  wouldRecommendTrainer: string | null;
}
