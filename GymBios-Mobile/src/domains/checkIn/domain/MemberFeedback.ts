export interface MemberCheckInStatus {
  checkedIn?: boolean;
  checked_in?: boolean;
  attendanceId?: number | null;
  attendance_id?: number | null;
  checkInTime?: string | null;
  check_in_time?: string | null;
}

export interface MemberCheckInResponse {
  checkedIn?: boolean;
  checked_in?: boolean;
  attendanceId?: number;
  attendance_id?: number;
  checkInTime?: string;
  check_in_time?: string;
  message?: string;
}

export interface MemberCheckOutResponse {
  checkedIn?: boolean;
  checked_in?: boolean;
  attendanceId?: number;
  attendance_id?: number;
  checkInTime?: string;
  check_in_time?: string;
  checkOutTime?: string;
  check_out_time?: string;
  durationMinutes?: number;
  duration_minutes?: number;
  message?: string;
}

export interface MemberFeedbackPayload {
  attendanceId?: number;
  attendance_id?: number;
  overallSatisfaction: number;
  overall_satisfaction?: number;
  workoutIntensity: number;
  workout_intensity?: number;
  equipmentQuality: number;
  equipment_quality?: number;
  facilityRating: number;
  facility_rating?: number;
  recommendWorkout: string;
  recommend_workout?: string;
  difficultyLevel: string;
  difficulty_level?: number | string;
  paceRating: string;
  pace_rating?: string;
  bestAspects?: string[];
  best_aspects?: string[];
  areasForImprovement?: string[];
  areas_for_improvement?: string[];
  comments?: string;
  suggestions?: string;
  energyAfterWorkout: string;
  energy_after_workout?: string;
  likelyToReturn: number;
  likely_to_return?: number;
  trainerRating?: number;
  trainer_rating?: number;
  wouldRecommendTrainer?: string;
  would_recommend_trainer?: string;
}

export interface MemberFeedbackResponse {
  success: boolean;
  attendanceId?: number;
  attendance_id?: number;
}
