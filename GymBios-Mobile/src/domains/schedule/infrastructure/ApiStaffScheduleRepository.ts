import { apiClient } from '@/core/network/apiClient';
import type { StaffScheduleData, ScheduleTask, UpcomingFollowUp } from '../domain/StaffScheduleData';

interface BackendContact {
  id: number;
  name: string;
  phone: string;
}

interface BackendTask {
  id: number;
  scheduled_at: string; // e.g. "2026-08-21T09:00:00"
  type: string;
  priority: string;
  status: string;
  subject: string;
  contact: BackendContact | null;
}

interface BackendUpcomingFollowUp {
  id: number;
  scheduled_at: string;
  subject: string;
  type: string;
  contact: BackendContact | null;
}

interface BackendScheduleSummary {
  today: number;
  this_week: number;
  pending: number;
  high_priority: number;
}

interface BackendStaffScheduleResponse {
  date: string;
  summary: BackendScheduleSummary;
  tasks: BackendTask[];
  upcoming_follow_ups: BackendUpcomingFollowUp[];
}

export class ApiStaffScheduleRepository {
  /**
   * GET /api/mobile/staff/schedule
   */
  async getStaffSchedule(date?: string): Promise<StaffScheduleData> {
    const url = date ? `/mobile/staff/schedule?date=${date}` : '/mobile/staff/schedule';
    const response = await apiClient.get<BackendStaffScheduleResponse>(url);
    const data = response.data;

    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      dateText: formattedDate,
      stats: {
        today: data.summary.today || 0,
        thisWeek: data.summary.this_week || 0,
        pending: data.summary.pending || 0,
      },
      tasks: (data.tasks || []).map((task) => {
        let time = '';
        try {
          if (task.scheduled_at) {
            const dateObj = new Date(task.scheduled_at);
            time = dateObj.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          }
        } catch {
          time = task.scheduled_at;
        }

        let typeFormatted = 'Follow-up';
        if (task.type?.toLowerCase() === 'meeting') typeFormatted = 'Meeting';
        if (task.type?.toLowerCase() === 'visit') typeFormatted = 'Tour';

        return {
          id: task.id,
          time,
          type: typeFormatted,
          name: task.contact?.name || 'Unknown Contact',
          action: task.subject || 'Follow-up',
          priority: (task.priority?.toLowerCase() || 'medium') as 'high' | 'medium' | 'low',
          completed: task.status?.toLowerCase() === 'completed',
          phone: task.contact?.phone || undefined,
        };
      }),
      upcomingFollowUps: (data.upcoming_follow_ups || []).map((fu) => {
        let dateStr = '';
        let time = '';
        try {
          if (fu.scheduled_at) {
            const dateObj = new Date(fu.scheduled_at);
            dateStr = dateObj.toISOString().split('T')[0];
            time = dateObj.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
          }
        } catch {
          dateStr = fu.scheduled_at;
        }

        let typeFormatted = 'Follow-up';
        if (fu.type?.toLowerCase() === 'meeting') typeFormatted = 'Meeting';
        if (fu.type?.toLowerCase() === 'visit') typeFormatted = 'Tour';

        return {
          id: fu.id,
          name: fu.contact?.name || 'Unknown Contact',
          date: dateStr,
          time,
          type: fu.subject || typeFormatted,
        };
      }),
      productivityTip: 'Complete your high-priority follow-ups before noon to maximize conversion chances!',
    };
  }

  /**
   * PATCH /api/mobile/staff/schedule/{id}/complete
   */
  async completeTask(taskId: string | number): Promise<void> {
    await apiClient.patch(`/mobile/staff/schedule/${taskId}/complete`);
  }
}

export const staffScheduleRepository = new ApiStaffScheduleRepository();
