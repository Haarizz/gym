import { authService } from './auth-service';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export interface StaffAttendanceRecord {
  id: number;
  staff_db_id: number;
  staff_biz_id: string;
  staff_name: string;
  staff_role: string;
  staff_department: string;
  photo_url?: string;
  clock_in_time: string;
  clock_out_time?: string;
  total_minutes?: number;
  formatted_duration?: string;
  status: 'working' | 'completed';
  device_id: string;
}

export interface AttendanceStats {
  today_visits: number;
  active_now: number;
  avg_duration_minutes: number;
  peak_hour: string;
  attendance_rate: number;
  total_active_members: number;
  weekly_trend: { day: string; visits: number; date: string }[];
  monthly_trend: { month: string; visits: number }[];
}

export interface AttendanceListItem {
  id: number;
  member_db_id?: number;
  member_biz_id?: string;
  member_name?: string;
  photo_url?: string;
  membership_type?: string;
  walk_in_name?: string;
  walk_in_phone?: string;
  walk_in_email?: string;
  walk_in_payment_status?: string;
  check_in_time: string;
  check_out_time?: string;
  total_minutes?: number;
  formatted_duration?: string;
  activity_type?: string;
  status: 'active' | 'completed';
  type: 'member' | 'walk_in';
  check_in_method: string;
  device_id: string;
}

/** Attendance › one day: GET /api/attendance/day-report (snake_case, timestamps are UTC instants). */
export type VisitKind = 'member' | 'walk_in' | 'trainer' | 'staff';

export interface DayVisit {
  key: string;
  kind: VisitKind;
  record_id: number;
  person_id?: number | null;
  code?: string | null;
  name: string;
  photo_url?: string | null;
  /** Plan for members, phone for walk-ins, role for staff. */
  detail?: string | null;
  check_in: string;
  check_out?: string | null;
  /** Closed visits: time spent; still inside: minutes so far (when the report was made). */
  minutes: number;
  inside: boolean;
  from_earlier_day: boolean;
  long_stay: boolean;
  method?: string | null;
  activity?: string | null;
  workout_minutes?: number | null;
  workout_running: boolean;
  payment_status?: string | null;
}

export interface DayHour { hour: number; label: string; members: number; walk_ins: number; staff: number; trainers: number; inside: number }
export interface DayCount { date: string; label: string; visits: number }

export interface RosterRow {
  staff_id: number;
  code?: string | null;
  name: string;
  role?: string | null;
  trainer: boolean;
  photo_url?: string | null;
  shift_name?: string | null;
  scheduled_in?: string | null;
  scheduled_out?: string | null;
  actual_in?: string | null;
  actual_out?: string | null;
  worked_minutes: number;
  late_minutes: number;
  status: string;
  inside: boolean;
}

export interface DaySummary {
  visits: number; member_visits: number; unique_members: number; walk_ins: number; checked_out: number;
  avg_stay_minutes: number; longest_stay_minutes: number; longest_stay_name?: string | null;
  peak_hour?: string | null; peak_hour_visits: number; peak_inside: number;
  inside_members: number; inside_walk_ins: number; inside_trainers: number; inside_staff: number;
  trainers_present: number; staff_present: number; roster_scheduled: number; roster_absent: number; roster_late: number;
  yesterday_visits: number; last_week_visits: number; long_stays: number;
}

export interface DayReport {
  date: string;
  time_zone: string;
  today: boolean;
  generated_at: string;
  summary: DaySummary;
  visits: DayVisit[];
  hourly: DayHour[];
  last_days: DayCount[];
  roster: RosterRow[];
}

/** Attendance Reports: GET /api/attendance/range-report (gym calendar days, vs the previous period). */
export interface RangeTotals {
  visits: number; member_visits: number; walk_ins: number; unique_members: number; avg_per_day: number;
  avg_stay_minutes: number; total_minutes: number; no_checkout: number; visits_per_member: number;
}
export interface RangeSummary {
  from: string; to: string; days: number; elapsed_days: number; compare_from: string; compare_to: string;
  current: RangeTotals; previous: RangeTotals; active_members: number; reach_pct: number; new_visitors: number;
  peak_hour?: string | null; peak_hour_visits: number; busiest_date?: string | null; busiest_date_visits: number;
  busiest_weekday?: string | null; quietest_weekday?: string | null; not_visited_count: number;
}
export interface RangeDay {
  date: string; label: string; weekday: string; visits: number; members: number; walk_ins: number; unique_members: number;
  avg_stay_minutes: number; previous_visits: number | null; future: boolean;
}
export interface RangeSlice { label: string; count: number; pct: number }
export interface RangeMember {
  id: number; code?: string | null; name: string; photo_url?: string | null; plan?: string | null; visits: number;
  days_visited: number; avg_stay_minutes: number; total_minutes: number; per_week: number; first_visit?: string | null;
  last_visit?: string | null; usual_time?: string | null; new_visitor: boolean;
}
export interface RangeAbsent {
  id: number; code?: string | null; name: string; phone?: string | null; photo_url?: string | null; plan?: string | null;
  last_visit?: string | null; days_since_last_visit?: number | null; membership_ends?: string | null;
}
export interface RangeStaff {
  id: number; code?: string | null; name: string; role?: string | null; trainer: boolean; photo_url?: string | null;
  sessions: number; days_present: number; total_minutes: number; avg_minutes_per_day: number; usual_in?: string | null;
  scheduled_days?: number | null; late_days?: number | null; late_minutes?: number | null; absent_days?: number | null;
  overtime_minutes?: number | null; punctuality_pct?: number | null; open_now: boolean;
}
export interface RangeReport {
  time_zone: string; generated_at: string; summary: RangeSummary; daily: RangeDay[];
  weekdays: { day: string; visits: number; occurrences: number; average: number }[];
  heatmap: number[][]; hourly: number[]; stay: RangeSlice[]; methods: RangeSlice[]; activities: RangeSlice[];
  plans: RangeSlice[]; frequency: RangeSlice[]; members: RangeMember[]; not_visited: RangeAbsent[]; staff: RangeStaff[];
  roster_included: boolean; insights: { tone: 'good' | 'warning' | 'info'; title: string; text: string }[];
}

/** A checkout the branch's minimum visit time blocks until the desk confirms. */
export class MinVisitNotReachedError extends Error {}

const CLIENT_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } })();

export interface AttendanceListResponse {
  items: AttendanceListItem[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
}

class StaffAttendanceService {

  async clockIn(staffId: number, deviceId = 'WEB'): Promise<StaffAttendanceRecord> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/staff/attendance/clock-in`,
      { method: 'POST', body: JSON.stringify({ staff_id: staffId, device_id: deviceId }) }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Clock-in failed: ${res.status}`);
    return data;
  }

  async clockOut(staffId: number): Promise<StaffAttendanceRecord> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/staff/attendance/clock-out?staff_id=${staffId}`,
      { method: 'POST' }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Clock-out failed: ${res.status}`);
    return data;
  }

  async getTodayStaffAttendance(): Promise<StaffAttendanceRecord[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE}/staff/attendance/today`);
    if (!res.ok) throw new Error(`Failed to fetch staff attendance: ${res.status}`);
    return res.json();
  }

  async getActiveSession(staffId: number): Promise<{ active: boolean; record?: StaffAttendanceRecord }> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/staff/attendance/active?staff_id=${staffId}`
    );
    if (!res.ok) return { active: false };
    return res.json();
  }

  async getAttendance(date?: string, search?: string, page = 0, size = 50, startDate?: string, endDate?: string): Promise<AttendanceListResponse> {
    const params = new URLSearchParams();
    if (startDate && endDate) {
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    } else if (date) {
      params.append('date', date);
    }
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('size', String(size));
    const res = await authService.makeAuthenticatedRequest(`${BASE}/attendance?${params}`);
    if (!res.ok) throw new Error(`Failed to fetch attendance: ${res.status}`);
    return res.json();
  }

  async getStats(): Promise<AttendanceStats> {
    const res = await authService.makeAuthenticatedRequest(`${BASE}/attendance/stats`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
    return res.json();
  }

  async getDayReport(date?: string): Promise<DayReport> {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await authService.makeAuthenticatedRequest(`${BASE}/attendance/day-report${q}`, {
      headers: CLIENT_TZ ? { 'X-Client-Timezone': CLIENT_TZ } : undefined,
    });
    if (!res.ok) throw new Error(`Failed to load the day report: ${res.status}`);
    return res.json();
  }

  async getRangeReport(from: string, to: string): Promise<RangeReport> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/attendance/range-report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers: CLIENT_TZ ? { 'X-Client-Timezone': CLIENT_TZ } : undefined },
    );
    if (!res.ok) throw new Error(`Failed to load the attendance report: ${res.status}`);
    return res.json();
  }

  /** force = check out before the branch's minimum visit time (after the desk confirms). */
  async checkout(attendanceId: number, force = false) {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/attendance/${attendanceId}/checkout${force ? '?force=true' : ''}`,
      { method: 'POST' }
    );
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data?.code === 'MIN_VISIT_NOT_REACHED') throw new MinVisitNotReachedError(data?.error || 'Minimum visit time not reached');
    if (!res.ok) throw new Error(data?.error || 'Checkout failed');
    return data;
  }

  /** Clocks a staff member or trainer out (the desk closing a shift someone forgot to end). */
  async clockOutRecord(staffAttendanceId: number): Promise<StaffAttendanceRecord> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/staff/attendance/${staffAttendanceId}/clock-out`,
      { method: 'POST' }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Clock-out failed: ${res.status}`);
    return data;
  }
}

export const staffAttendanceService = new StaffAttendanceService();
