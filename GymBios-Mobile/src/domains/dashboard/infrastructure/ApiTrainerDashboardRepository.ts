import { apiClient } from '@/core/network/apiClient';
import type { TrainerDashboardData, TrainerTodaySession } from '../domain/TrainerDashboardData';

interface BackendTrainerSession {
  id: string | number;
  start_time: string; // e.g. "2026-08-20T09:00:00"
  member_name: string | null;
  class_name: string | null;
  type: string;
  focus: string;
  status: string;
}

interface BackendTrainerDashboardData {
  trainer_info: {
    name: string;
    specialization: string;
    rating: number;
  };
  todays_stats: {
    sessions_scheduled: number;
    sessions_completed: number;
    active_members: number;
    today_earnings: number;
    monthly_target_percentage: number;
  };
  today_sessions: BackendTrainerSession[];
}

export class ApiTrainerDashboardRepository {
  /**
   * GET /api/mobile/trainer/dashboard
   * Fetches the scoped trainer dashboard dataset from the backend.
   */
  async getTrainerDashboard(): Promise<TrainerDashboardData> {
    const response = await apiClient.get<BackendTrainerDashboardData>('/mobile/trainer/dashboard');
    const data = response.data;

    // Map backend response (snake_case) to frontend domain model (camelCase)
    return {
      trainerInfo: {
        name: data.trainer_info?.name || 'Trainer',
        specialization: data.trainer_info?.specialization || 'General',
        rating: data.trainer_info?.rating || 4.9,
      },
      todaysStats: {
        sessionsScheduled: data.todays_stats?.sessions_scheduled || 0,
        sessionsCompleted: data.todays_stats?.sessions_completed || 0,
        activeMembers: data.todays_stats?.active_members || 0,
        todayEarnings: `₹${(data.todays_stats?.today_earnings || 0).toLocaleString('en-IN')}`,
        monthlyTargetPercentage: data.todays_stats?.monthly_target_percentage || 0,
      },
      todaySessions: (data.today_sessions || []).map((session) => {
        // Parse "2026-08-20T09:00:00" into "09:00 AM"
        let formattedTime = '';
        try {
          const date = new Date(session.start_time);
          formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        } catch {
          formattedTime = session.start_time;
        }

        let mappedStatus: TrainerTodaySession['status'] = 'upcoming';
        if (session.status === 'completed') mappedStatus = 'completed';
        else if (session.status === 'in_progress') mappedStatus = 'in_progress';

        return {
          id: session.id,
          time: formattedTime,
          member: session.member_name,
          className: session.class_name,
          type: session.type,
          focus: session.focus,
          status: mappedStatus,
        };
      }),
      pendingTasks: [], // Explicitly deferred as per backend instructions
    };
  }

  /**
   * PATCH /api/mobile/trainer/dashboard/sessions/{sessionId}/start
   * Transitions a session to in_progress state.
   */
  async startSession(sessionId: string | number): Promise<void> {
    await apiClient.patch(`/mobile/trainer/dashboard/sessions/${sessionId}/start`);
  }

  /**
   * PATCH /api/mobile/trainer/dashboard/sessions/{sessionId}/finish
   * Transitions an in-progress session to completed state.
   */
  async finishSession(sessionId: string | number): Promise<void> {
    await apiClient.patch(`/mobile/trainer/dashboard/sessions/${sessionId}/finish`);
  }
}

export const trainerDashboardRepository = new ApiTrainerDashboardRepository();
