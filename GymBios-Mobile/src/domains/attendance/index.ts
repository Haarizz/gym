// ── Domain Models ───────────────────────────────────────────────────────────

export type { Attendance } from './domain/Attendance';
export { AttendanceStatus, AttendanceType } from './domain/Attendance';

export type {
  AttendanceStats,
  WeeklyTrendPoint,
  MonthlyTrendPoint,
} from './domain/AttendanceStats';

export type {
  AttendanceReport,
  DailySummaryRow,
  ActivityBreakdown,
  MemberConsistencyRow,
  FacilityBreakdown,
} from './domain/AttendanceReport';

// ── Application Layer ───────────────────────────────────────────────────────

export type {
  AttendanceRepository,
  AttendanceFilters,
  Pagination,
  AttendancePage,
  ReportRange,
  CheckOutResult,
} from './application/AttendanceRepository';

export { AttendanceService } from './application/AttendanceService';


// ── TanStack Query Keys ─────────────────────────────────────────────────────

export { attendanceKeys } from './hooks/attendanceKeys';

// ── Query Hooks ─────────────────────────────────────────────────────────────

export {
  useAttendance,
  useAttendanceStats,
  useAttendanceReport,
} from './hooks/useAttendance';

// ── Mutation Hooks ──────────────────────────────────────────────────────────

export {
  useCheckout,
} from './hooks/useAttendanceActions';