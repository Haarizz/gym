import type {
  Attendance,
  AttendanceReport,
  AttendanceStats,
} from '../domain';
import type {
  AttendanceFilters,
  AttendancePage,
  AttendanceRepository,
  CheckOutResult,
  ReportRange,
} from './AttendanceRepository';

/**
 * Coordinates attendance operations.
 *
 * Depends on the AttendanceRepository abstraction for data access.
 */
export class AttendanceService {
  constructor(
    private readonly repository: AttendanceRepository,
  ) {}

  getAttendance(filters?: AttendanceFilters): Promise<AttendancePage> {
    return this.repository.getAttendance(filters);
  }

  getAttendanceStats(): Promise<AttendanceStats> {
    return this.repository.getAttendanceStats();
  }

  getAttendanceReport(range?: ReportRange): Promise<AttendanceReport> {
    return this.repository.getAttendanceReport(range);
  }

  /**
   * Check out an attendance record.
   */
  checkout(id: number): Promise<CheckOutResult> {
    return this.repository.checkout(id);
  }
}

export type { Attendance, AttendanceReport, AttendanceStats };
