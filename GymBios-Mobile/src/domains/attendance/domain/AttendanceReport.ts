/**
 * Domain models for the Attendance Reports feature.
 *
 * All structures mirror the backend GET /api/attendance/reports response.
 * Field names are kept intentionally close to the backend JSON so that
 * mapper code in AttendanceApiRepository is easy to verify at a glance.
 */

// ── Daily summary ────────────────────────────────────────────────────────────

/**
 * One row in the per-day breakdown.
 * `date`     — formatted display label (e.g. "Aug 7")
 * `fullDate` — ISO date string for sorting / keying (e.g. "2026-08-07")
 * `visits`   — total check-ins on that day
 * `avgDuration` — average session length in minutes (completed sessions only)
 */
export interface DailySummaryRow {
  date?: string;
  fullDate?: string;
  visits?: number;
  avgDuration?: number;
}

// ── Activity breakdown ───────────────────────────────────────────────────────

/**
 * Visits grouped by activity type.
 */
export interface ActivityBreakdown {
  type?: string;
  count?: number;
  percentage?: number;
}

// ── Peak hours ───────────────────────────────────────────────────────────────

/**
 * One row in the peak-hours heatmap (one row per hour, 6 am – 10 pm).
 * The backend provides total visit counts split by day-of-week column.
 * `hour`  — short label used as axis tick (e.g. "6am")
 * `label` — full label for display (e.g. "6:00 AM")
 * `Sun`…`Sat` — per-day-of-week visit count
 */
export interface PeakHourRow {
  hour?: string;
  label?: string;
  Sun?: number;
  Mon?: number;
  Tue?: number;
  Wed?: number;
  Thu?: number;
  Fri?: number;
  Sat?: number;
}

// ── Monthly trend ─────────────────────────────────────────────────────────────

/** Visits grouped by month (within the report date range). */
export interface MonthlyTrendPoint {
  month?: string;
  visits?: number;
}

// ── Member consistency ────────────────────────────────────────────────────────

/**
 * One member row inside topConsistentMembers / irregularMembers.
 */
export interface MemberConsistencyRow {
  id?: number;
  name?: string;
  visits?: number;
  attendanceRate?: number;
}

// ── Facility breakdown ────────────────────────────────────────────────────────

/**
 * Facility utilisation entry.
 * `name`  — facility label (e.g. "Cardio Area")
 * `value` — percentage share of total visits (0–100)
 * `count` — raw visit count
 * `color` — hex colour for charts
 */
export interface FacilityBreakdown {
  name?: string;
  value?: number;
  count?: number;
  color?: string;
}

// ── Insights ──────────────────────────────────────────────────────────────────

/**
 * One AI-generated insight.
 * `type` — visual styling hint: "success" | "warning" | "info"
 */
export interface ReportInsight {
  id?: number;
  type?: string;
  title?: string;
  message?: string;
}

// ── Summary ───────────────────────────────────────────────────────────────────

/**
 * Pre-computed aggregate summary provided directly by the backend.
 * Do not re-derive these values on the frontend.
 */
export interface ReportSummary {
  totalVisits?: number;
  avgDailyVisits?: number;
  attendanceRate?: number;
  peakHour?: string;
  totalActiveMembers?: number;
  daysInRange?: number;
}

// ── Top-level report ──────────────────────────────────────────────────────────

/**
 * Full attendance analytics report for the reports screen.
 * Mirrors the backend GET /api/attendance/reports response.
 */
export interface AttendanceReport {
  dailySummary: DailySummaryRow[];
  activityBreakdown: ActivityBreakdown[];
  peakHours: PeakHourRow[];
  monthlyTrend: MonthlyTrendPoint[];
  topConsistentMembers: MemberConsistencyRow[];
  irregularMembers: MemberConsistencyRow[];
  facilityBreakdown: FacilityBreakdown[];
  insights: ReportInsight[];
  summary?: ReportSummary;
}