import { apiClient } from '@/core/network/apiClient';

/**
 * Low-level HTTP client for the Attendance backend endpoints.
 *
 * This layer is responsible ONLY for communicating with the backend.
 * It contains no business logic — all response mapping happens in
 * AttendanceApiRepository.
 */

// ── Response DTOs (mirror backend) ─────────────────────────────────────────

export interface AttendanceListItemResponse {
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
  check_in_time?: string;
  check_out_time?: string;
  total_minutes?: number;
  formatted_duration?: string;
  activity_type?: string;
  status?: string;
  type?: string;
  check_in_method?: string;
  device_id?: string;
}

export interface AttendancePageResponse {
  /** The list of attendance records for this page. */
  items: AttendanceListItemResponse[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface AttendanceStatsResponse {
  today_visits: number;
  active_now: number;
  avg_duration_minutes: number;
  peak_hour: string;
  attendance_rate: number;
  total_active_members: number;
  weekly_trend: WeeklyTrendResponse[];
  monthly_trend: MonthlyTrendResponse[];
}

export interface WeeklyTrendResponse {
  day: string;
  visits: number;
}

export interface MonthlyTrendResponse {
  month: string;
  visits: number;
}

export interface CheckOutResponse {
  success: boolean;
  message?: string;
  attendance_id?: number;
  check_out_time?: string;
  total_minutes?: number;
  formatted_duration?: string;
}

// ── Report response (mirrors Map<String,Object> returned by
//    AttendanceService.getReport) ─────────────────────────────────────────────

/** One row in the per-day summary array. */
export interface DailySummaryResponse {
  date?: string;        // formatted label, e.g. "Aug 7"
  fullDate?: string;    // ISO date string, e.g. "2026-08-07"
  visits?: number;
  avgDuration?: number; // average minutes for completed sessions that day
}

/** Activity-type breakdown entry. */
export interface ActivityBreakdownResponse {
  type?: string;
  count?: number;
  percentage?: number;
}

/**
 * Peak-hours heatmap row (one per hour, 6 am – 10 pm).
 * In addition to `hour` and `label` the backend adds one numeric key per
 * day-of-week: Sun, Mon, Tue, Wed, Thu, Fri, Sat.
 */
export interface PeakHourResponse {
  hour?: string;   // e.g. "6am"
  label?: string;  // e.g. "6:00 AM"
  Sun?: number;
  Mon?: number;
  Tue?: number;
  Wed?: number;
  Thu?: number;
  Fri?: number;
  Sat?: number;
}

/** One member row inside topConsistentMembers / irregularMembers. */
export interface MemberConsistencyResponse {
  id?: number;
  name?: string;
  visits?: number;
  attendanceRate?: number;
}

/** Facility breakdown entry. */
export interface FacilityBreakdownResponse {
  name?: string;
  value?: number;  // percentage (0–100)
  count?: number;  // raw visit count
  color?: string;  // hex color for charts
}

/** Insight object returned by the backend. */
export interface InsightResponse {
  id?: number;
  type?: string;    // "success" | "warning" | "info"
  title?: string;
  message?: string;
}

/** Summary sub-object returned by the backend. */
export interface ReportSummaryResponse {
  totalVisits?: number;
  avgDailyVisits?: number;
  attendanceRate?: number;
  peakHour?: string;
  totalActiveMembers?: number;
  daysInRange?: number;
}

/** Full reports response. All arrays default to [] when the period has no data. */
export interface AttendanceReportResponse {
  dailySummary?: DailySummaryResponse[];
  activityBreakdown?: ActivityBreakdownResponse[];
  peakHours?: PeakHourResponse[];
  monthlyTrend?: { month?: string; visits?: number }[];
  topConsistentMembers?: MemberConsistencyResponse[];
  irregularMembers?: MemberConsistencyResponse[];
  facilityBreakdown?: FacilityBreakdownResponse[];
  insights?: InsightResponse[];
  summary?: ReportSummaryResponse;
}

// ── HTTP client ────────────────────────────────────────────────────────────

export const attendanceApi = {
  /**
   * GET /api/attendance?date=&startDate=&endDate=&search=&page=&size=
   */
  async getAttendance(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<AttendancePageResponse> {
    const response = await apiClient.get<AttendancePageResponse>('/attendance', {
      params,
    });
    return response.data;
  },

  /**
   * GET /api/attendance/stats
   */
  async getStats(): Promise<AttendanceStatsResponse> {
    const response = await apiClient.get<AttendanceStatsResponse>('/attendance/stats');
    return response.data;
  },

  /**
   * GET /api/attendance/reports?startDate=&endDate=
   */
  async getReport(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AttendanceReportResponse> {
    const response = await apiClient.get<AttendanceReportResponse>('/attendance/reports', {
      params,
    });
    return response.data;
  },

  /**
   * POST /api/attendance/{id}/checkout
   */
  async checkout(id: number): Promise<CheckOutResponse> {
    const response = await apiClient.post<CheckOutResponse>(`/attendance/${id}/checkout`);
    return response.data;
  },

};