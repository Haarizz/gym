import type {
  Attendance,
  AttendanceReport,
  AttendanceStats,
} from '../domain';

/**
 * Filters for the paginated attendance list.
 * Mirrors backend GET /api/attendance query parameters.
 */
export interface AttendanceFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  size?: number;
}

/**
 * Pagination metadata returned by the backend.
 */
export interface Pagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated attendance response.
 */
export interface AttendancePage {
  attendance: Attendance[];
  pagination: Pagination;
}

/**
 * Date range for an attendance report.
 */
export interface ReportRange {
  startDate?: string;
  endDate?: string;
}

/**
 * Result of a check-out operation.
 * Mirrors backend CheckOutResponse.
 */
export interface CheckOutResult {
  success: boolean;
  message?: string;
  attendanceId?: number;
  checkOutTime?: string;
  totalMinutes?: number;
  formattedDuration?: string;
}

/**
 * Repository contract for the Attendance domain.
 * Implementations (e.g. AttendanceApiRepository) handle all HTTP concerns.
 */
export interface AttendanceRepository {
  getAttendance(filters?: AttendanceFilters): Promise<AttendancePage>;

  getAttendanceStats(): Promise<AttendanceStats>;

  getAttendanceReport(range?: ReportRange): Promise<AttendanceReport>;

  checkout(id: number): Promise<CheckOutResult>;
}