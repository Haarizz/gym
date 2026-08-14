/**
 * One data point in the weekly trend chart.
 * Mirrors backend AttendanceStatsDTO.weeklyTrend entries.
 */
export interface WeeklyTrendPoint {
  day: string;
  visits: number;
  /** ISO date string for the trend day, e.g. "2026-08-04". */
  date?: string;
}


/**
 * One data point in the monthly trend chart.
 * Mirrors backend AttendanceStatsDTO.monthlyTrend entries.
 */
export interface MonthlyTrendPoint {
  month: string;
  visits: number;
}

/**
 * Aggregate attendance statistics for the dashboard.
 * Mirrors backend AttendanceStatsDTO.
 */
export interface AttendanceStats {
  todayVisits: number;
  activeNow: number;
  avgDurationMinutes: number;
  peakHour: string;
  attendanceRate: number;
  totalActiveMembers: number;
  weeklyTrend: WeeklyTrendPoint[];
  monthlyTrend: MonthlyTrendPoint[];
}