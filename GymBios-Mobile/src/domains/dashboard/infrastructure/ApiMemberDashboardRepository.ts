import { apiClient } from '@/core/network/apiClient';
import type {
  MemberDashboardData,
  MemberTodayScheduleItem,
} from '../domain/MemberDashboardData';

export interface MemberDashboardApiDTO {
  identity?: {
    member_id?: string;
    memberId?: string;
    name?: string;
    email?: string;
    phone?: string;
    user_role?: string;
    userRole?: string;
  };

  membership?: {
    plan_name?: string;
    planName?: string;
    membership_type?: string;
    membershipType?: string;
    status?: string;
    active?: boolean;
    start_date?: string;
    startDate?: string;
    end_date?: string;
    endDate?: string;
    expiry_date?: string;
    expiryDate?: string;
    days_remaining?: number;
    daysRemaining?: number;
    payment_status?: string;
    paymentStatus?: string;
    outstanding_balance?: number;
    outstandingBalance?: number;
  };

  check_in_status?: {
    checked_in?: boolean;
    checkedIn?: boolean;
    active_attendance_id?: number;
    activeAttendanceId?: number;
    check_in_time?: string;
    checkInTime?: string;
  };
  checkInStatus?: {
    checked_in?: boolean;
    checkedIn?: boolean;
    active_attendance_id?: number;
    activeAttendanceId?: number;
    check_in_time?: string;
    checkInTime?: string;
  };

  todays_schedule?: Array<{
    booking_id?: number;
    bookingId?: number;
    session_id?: number;
    sessionId?: number;
    session_name?: string;
    sessionName?: string;
    session_type?: string;
    sessionType?: string;
    trainer_name?: string;
    trainerName?: string;
    date?: string;
    start_time?: string;
    startTime?: string;
    end_time?: string;
    endTime?: string;
    duration_minutes?: number;
    durationMinutes?: number;
    location?: string;
    capacity?: number;
    booked_count?: number;
    bookedCount?: number;
    available_spots?: number;
    availableSpots?: number;
    booking_status?: string;
    bookingStatus?: string;
  }>;
  todaysSchedule?: Array<{
    booking_id?: number;
    bookingId?: number;
    session_id?: number;
    sessionId?: number;
    session_name?: string;
    sessionName?: string;
    session_type?: string;
    sessionType?: string;
    trainer_name?: string;
    trainerName?: string;
    date?: string;
    start_time?: string;
    startTime?: string;
    end_time?: string;
    endTime?: string;
    duration_minutes?: number;
    durationMinutes?: number;
    location?: string;
    capacity?: number;
    booked_count?: number;
    bookedCount?: number;
    available_spots?: number;
    availableSpots?: number;
    booking_status?: string;
    bookingStatus?: string;
  }>;

  activity_stats?: {
    total_visits?: number;
    totalVisits?: number;
    active_bookings_count?: number;
    activeBookingsCount?: number;
    current_streak_days?: number;
    currentStreakDays?: number;
  };
  activityStats?: {
    total_visits?: number;
    totalVisits?: number;
    active_bookings_count?: number;
    activeBookingsCount?: number;
    current_streak_days?: number;
    currentStreakDays?: number;
  };

  active_promotion?: {
    id?: number;
    name?: string;
    type?: string;
    description?: string;
    discount_type?: string;
    discountType?: string;
    discount_value?: number;
    discountValue?: number;
    code?: string;
    start_date?: string;
    startDate?: string;
    end_date?: string;
    endDate?: string;
  };
  activePromotion?: {
    id?: number;
    name?: string;
    type?: string;
    description?: string;
    discount_type?: string;
    discountType?: string;
    discount_value?: number;
    discountValue?: number;
    code?: string;
    start_date?: string;
    startDate?: string;
    end_date?: string;
    endDate?: string;
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

    const membership = data.membership;
    const rawCheckIn = data.checkInStatus || data.check_in_status;
    const rawStats = data.activityStats || data.activity_stats;
    const rawSchedule = data.todaysSchedule || data.todays_schedule || [];

    const memberInfo = {
      name: data.identity?.name || 'Member',

      role: membership?.membershipType || membership?.membership_type
        ? `${membership?.membershipType || membership?.membership_type} Member`
        : 'Member',

      gymName: 'Unassigned', // Backend currently doesn't send gym name in this DTO, but we should default to Unassigned rather than FitZone Downtown

      membershipType:
        membership?.planName ||
        membership?.plan_name ||
        membership?.membershipType ||
        membership?.membership_type ||
        'No Active Plan',

      daysRemaining: membership?.daysRemaining ?? membership?.days_remaining ?? 0,

      validUntil:
        (membership?.expiryDate || membership?.expiry_date)?.split('T')[0] ||
        (membership?.endDate || membership?.end_date)?.split('T')[0] ||
        '',

      isActive: membership?.active ?? false,
    };

    const checkInStatus = rawCheckIn
      ? {
          checkedIn: rawCheckIn.checkedIn ?? rawCheckIn.checked_in ?? false,
          activeAttendanceId:
            rawCheckIn.activeAttendanceId ?? rawCheckIn.active_attendance_id ?? null,
          checkInTime: rawCheckIn.checkInTime ?? rawCheckIn.check_in_time ?? null,
        }
      : undefined;

    const todaysSchedule: MemberTodayScheduleItem[] = rawSchedule.map((item) => ({
      id: item.bookingId || item.booking_id || item.sessionId || item.session_id || '',
      time: formatTime(item.startTime || item.start_time),
      class: item.sessionName || item.session_name || 'Class',
      trainer: item.trainerName || item.trainer_name || 'Instructor',
      spots:
        (item.availableSpots ?? item.available_spots ?? 0) <= 0
          ? 'Full'
          : `${item.availableSpots ?? item.available_spots} left`,
      location: item.location || 'Main Floor',
    }));

    const quickStats = [
      {
        label: 'Check-ins',
        value: String(rawStats?.totalVisits ?? rawStats?.total_visits ?? 0),
        icon: 'check-circle',
        color: '#327f74',
      },
      {
        label: 'Classes',
        value: String(rawStats?.activeBookingsCount ?? rawStats?.active_bookings_count ?? 0),
        icon: 'calendar',
        color: '#F5C742',
      },
      {
        label: 'Streak',
        value: `${rawStats?.currentStreakDays ?? rawStats?.current_streak_days ?? 0} days`,
        icon: 'award',
        color: '#8b5cf6',
      },
    ];

    return {
      memberInfo,
      todaysSchedule,
      quickStats,
      checkInStatus,
    };
  }
}

export const memberDashboardRepository = new ApiMemberDashboardRepository();
