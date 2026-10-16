export interface MemberCheckInStatus {
  checkedIn?: boolean;
  checked_in?: boolean;
  attendanceId?: number | null;
  attendance_id?: number | null;
  checkInTime?: string | null;
  check_in_time?: string | null;
  /** Plan quota unit — "Sessions" | "Days" | "Hours"; null when the plan is unlimited. */
  limitUnit?: string | null;
  /** Allowed amount per period; null when unlimited. */
  limitValue?: number | null;
  used?: number | null;
  /** "Payment" | "Week" | "Month" | "Year"; null when unlimited. */
  limitPeriod?: string | null;
  checkInsToday?: number;
  maxCheckInsPerDay?: number;
  /** End of the cooldown after the last check-out, if still cooling down. */
  nextCheckInAllowedAt?: string | null;
  canCheckIn?: boolean;
  /** Why a check-in would be refused right now (quota, daily cap or cooldown). */
  blockedReason?: string | null;
  /** Workout timer on the current visit — start while running, minutes once ended. */
  workoutStartTime?: string | null;
  workoutEndTime?: string | null;
  workoutMinutes?: number | null;
  /**
   * A visit from an earlier day that was never checked out. The member isn't
   * checked in; the next check-in closes it at unclosedAutoCloseTime.
   */
  unclosedAttendanceId?: number | null;
  unclosedCheckInTime?: string | null;
  unclosedAutoCloseTime?: string | null;
}

export interface MemberWorkoutResponse {
  attendanceId?: number;
  workoutStartTime?: string | null;
  workoutEndTime?: string | null;
  workoutMinutes?: number | null;
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
  workoutMinutes?: number | null;
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
