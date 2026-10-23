import { apiClient } from '@/core/network/apiClient';
import type {
  MemberCheckInResponse,
  MemberCheckInStatus,
  MemberCheckOutResponse,
  MemberFeedbackPayload,
  MemberFeedbackResponse,
  MemberBreakResponse,
} from '../domain/MemberFeedback';

/** The backend serialises snake_case; accept either spelling. */
function pick<T>(data: Record<string, any>, camel: string, snake: string): T | undefined {
  return (data[camel] ?? data[snake]) as T | undefined;
}

export const memberCheckInApi = {
  async getStatus(): Promise<MemberCheckInStatus> {
    const response = await apiClient.get<MemberCheckInStatus>('/mobile/member/check-in/status');
    const data = response.data as Record<string, any>;
    return {
      ...data,
      checkedIn: pick<boolean>(data, 'checkedIn', 'checked_in') ?? false,
      attendanceId: pick<number>(data, 'attendanceId', 'attendance_id') ?? null,
      checkInTime: pick<string>(data, 'checkInTime', 'check_in_time') ?? null,
      limitUnit: pick<string>(data, 'limitUnit', 'limit_unit') ?? null,
      limitValue: pick<number>(data, 'limitValue', 'limit_value') ?? null,
      used: pick<number>(data, 'used', 'used') ?? null,
      limitPeriod: pick<string>(data, 'limitPeriod', 'limit_period') ?? null,
      checkInsToday: pick<number>(data, 'checkInsToday', 'check_ins_today'),
      maxCheckInsPerDay: pick<number>(data, 'maxCheckInsPerDay', 'max_check_ins_per_day'),
      nextCheckInAllowedAt: pick<string>(data, 'nextCheckInAllowedAt', 'next_check_in_allowed_at') ?? null,
      canCheckIn: pick<boolean>(data, 'canCheckIn', 'can_check_in'),
      blockedReason: pick<string>(data, 'blockedReason', 'blocked_reason') ?? null,
      breakStartTime: pick<string>(data, 'breakStartTime', 'break_start_time') ?? null,
      breakMinutes: pick<number>(data, 'breakMinutes', 'break_minutes') ?? 0,
      breakAllowanceMinutes: pick<number>(data, 'breakAllowanceMinutes', 'break_allowance_minutes') ?? 0,
      checkOutAvailableAt: pick<string>(data, 'checkOutAvailableAt', 'check_out_available_at') ?? null,
      unclosedAttendanceId: pick<number>(data, 'unclosedAttendanceId', 'unclosed_attendance_id') ?? null,
      unclosedCheckInTime: pick<string>(data, 'unclosedCheckInTime', 'unclosed_check_in_time') ?? null,
      unclosedAutoCloseTime: pick<string>(data, 'unclosedAutoCloseTime', 'unclosed_auto_close_time') ?? null,
    };
  },

  async checkIn(): Promise<MemberCheckInResponse> {
    // MemberCheckInCard shows its own toast for refusals (limits, cooldown).
    const response = await apiClient.post<MemberCheckInResponse>('/mobile/member/check-in', {}, {
      skipGlobalErrorToast: true,
    });
    const data = response.data;
    return {
      ...data,
      checkedIn: data.checkedIn ?? data.checked_in ?? true,
      attendanceId: data.attendanceId ?? data.attendance_id,
      checkInTime: data.checkInTime ?? data.check_in_time,
    };
  },

  async checkOut(): Promise<MemberCheckOutResponse> {
    // MemberCheckInCard shows its own toast for refusals (minimum visit time).
    const response = await apiClient.post<MemberCheckOutResponse>('/mobile/member/check-out', {}, {
      skipGlobalErrorToast: true,
    });
    const data = response.data;
    return {
      ...data,
      checkedIn: data.checkedIn ?? data.checked_in ?? false,
      attendanceId: data.attendanceId ?? data.attendance_id,
      checkInTime: data.checkInTime ?? data.check_in_time,
      checkOutTime: data.checkOutTime ?? data.check_out_time,
      durationMinutes: data.durationMinutes ?? data.duration_minutes,
    };
  },

  async startBreak(): Promise<MemberBreakResponse> {
    const response = await apiClient.post('/mobile/member/check-in/break', {});
    return toBreak(response.data);
  },

  async resumeFromBreak(): Promise<MemberBreakResponse> {
    const response = await apiClient.post('/mobile/member/check-in/resume', {});
    return toBreak(response.data);
  },

  async submitFeedback(payload: MemberFeedbackPayload): Promise<MemberFeedbackResponse> {
    const serializedPayload = {
      attendance_id: payload.attendance_id ?? payload.attendanceId,
      attendanceId: payload.attendanceId ?? payload.attendance_id,
      overall_satisfaction: payload.overallSatisfaction ?? payload.overall_satisfaction,
      overallSatisfaction: payload.overallSatisfaction ?? payload.overall_satisfaction,
      workout_intensity: payload.workoutIntensity ?? payload.workout_intensity,
      workoutIntensity: payload.workoutIntensity ?? payload.workout_intensity,
      equipment_quality: payload.equipmentQuality ?? payload.equipment_quality,
      equipmentQuality: payload.equipmentQuality ?? payload.equipment_quality,
      facility_rating: payload.facilityRating ?? payload.facility_rating,
      facilityRating: payload.facilityRating ?? payload.facility_rating,
      recommend_workout: payload.recommendWorkout ?? payload.recommend_workout,
      recommendWorkout: payload.recommendWorkout ?? payload.recommend_workout,
      difficulty_level: payload.difficultyLevel ?? payload.difficulty_level,
      difficultyLevel: payload.difficultyLevel ?? payload.difficulty_level,
      pace_rating: payload.paceRating ?? payload.pace_rating,
      paceRating: payload.paceRating ?? payload.pace_rating,
      best_aspects: payload.bestAspects ?? payload.best_aspects,
      bestAspects: payload.bestAspects ?? payload.best_aspects,
      areas_for_improvement: payload.areasForImprovement ?? payload.areas_for_improvement,
      areasForImprovement: payload.areasForImprovement ?? payload.areas_for_improvement,
      comments: payload.comments,
      suggestions: payload.suggestions,
      energy_after_workout: payload.energyAfterWorkout ?? payload.energy_after_workout,
      energyAfterWorkout: payload.energyAfterWorkout ?? payload.energy_after_workout,
      likely_to_return: payload.likelyToReturn ?? payload.likely_to_return,
      likelyToReturn: payload.likelyToReturn ?? payload.likely_to_return,
      trainer_rating: payload.trainerRating ?? payload.trainer_rating,
      trainerRating: payload.trainerRating ?? payload.trainer_rating,
      would_recommend_trainer: payload.wouldRecommendTrainer ?? payload.would_recommend_trainer,
      wouldRecommendTrainer: payload.wouldRecommendTrainer ?? payload.would_recommend_trainer,
    };

    const response = await apiClient.post<MemberFeedbackResponse>(
      '/mobile/member/check-in/feedback',
      serializedPayload
    );
    return response.data;
  },
};

function toBreak(data: Record<string, any>): MemberBreakResponse {
  return {
    attendanceId: pick<number>(data, 'attendanceId', 'attendance_id'),
    breakStartTime: pick<string>(data, 'breakStartTime', 'break_start_time') ?? null,
    breakMinutes: pick<number>(data, 'breakMinutes', 'break_minutes') ?? 0,
  };
}
