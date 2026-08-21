import { apiClient } from '@/core/network/apiClient';
import type { MemberDashboardData, MemberTodayScheduleItem } from '../domain/MemberDashboardData';

export interface MemberDashboardApiDTO {
  identity?: {
    member_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    user_role?: string;
  };

  membership?: {
    plan_name?: string;
    membership_type?: string;
    status?: string;
    active?: boolean;
    start_date?: string;
    end_date?: string;
    expiry_date?: string;
    days_remaining?: number;
    payment_status?: string;
    outstanding_balance?: number;
  };

  check_in_status?: {
    checked_in?: boolean;
    active_attendance_id?: number;
    check_in_time?: string;
  };

  todays_schedule?: Array<{
    booking_id?: number;
    session_id?: number;
    session_name?: string;
    session_type?: string;
    trainer_name?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
    location?: string;
    capacity?: number;
    booked_count?: number;
    available_spots?: number;
    booking_status?: string;
  }>;

  activity_stats?: {
    total_visits?: number;
    active_bookings_count?: number;
    current_streak_days?: number;
  };

  active_promotion?: {
    id?: number;
    name?: string;
    type?: string;
    description?: string;
    discount_type?: string;
    discount_value?: number;
    code?: string;
    start_date?: string;
    end_date?: string;
  };
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const mins = parts[1] || '00';
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(formattedHours).padStart(2, '0')}:${mins} ${ampm}`;
}

export interface MemberDashboardRepository {
  getMemberDashboard(): Promise<MemberDashboardData>;
}

export class ApiMemberDashboardRepository implements MemberDashboardRepository {
  /**
   * GET /api/mobile/member/dashboard
   * Fetches the scoped member dashboard dataset from the backend.
   */
  async getMemberDashboard(): Promise<MemberDashboardData> {
    const response = await apiClient.get<MemberDashboardApiDTO>('/mobile/member/dashboard');
    const data = response.data;

    const memberInfo = {
      name: data.identity?.name || 'Member',

      role: data.membership?.membership_type
        ? `${data.membership.membership_type} Member`
        : 'Active Member',

      gymName: 'FitZone Downtown',

      membershipType:
        data.membership?.plan_name ||
        data.membership?.membership_type ||
        'Standard Plan',

      daysRemaining: data.membership?.days_remaining ?? 0,

      validUntil:
        data.membership?.expiry_date?.split('T')[0] ||
        data.membership?.end_date?.split('T')[0] ||
        '2026-12-31',

      isActive: data.membership?.active ?? false,
    };

    const todaysSchedule: MemberTodayScheduleItem[] =
      (data.todays_schedule || []).map((item) => ({
        id: item.booking_id || item.session_id || '',
        time: formatTime(item.start_time),
        class: item.session_name || 'Class',
        trainer: item.trainer_name || 'Instructor',
        spots:
          (item.available_spots ?? 0) <= 0
            ? 'Full'
            : `${item.available_spots} left`,
        location: item.location || 'Main Floor',
      }));

    const quickStats = [
      {
        label: 'Check-ins',
        value: String(data.activity_stats?.total_visits ?? 0),
        icon: 'check-circle',
        color: '#327f74',
      },
      {
        label: 'Classes',
        value: String(data.activity_stats?.active_bookings_count ?? 0),
        icon: 'calendar',
        color: '#F5C742',
      },
      {
        label: 'Streak',
        value: `${data.activity_stats?.current_streak_days ?? 0} days`,
        icon: 'award',
        color: '#8b5cf6',
      },
    ];

    return {
      memberInfo,
      todaysSchedule,
      quickStats,
    };
  }
}

export const memberDashboardRepository = new ApiMemberDashboardRepository();
