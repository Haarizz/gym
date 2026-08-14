import type {
  Attendance,
  AttendanceReport,
  AttendanceStats,
} from '../domain';
import { AttendanceStatus, AttendanceType } from '../domain';
import type {
  AttendanceFilters,
  AttendancePage,
  AttendanceRepository,
  CheckOutResult,
  ReportRange,
} from '../application/AttendanceRepository';
import {
  attendanceApi,
  type AttendanceListItemResponse,
  type AttendancePageResponse,
  type AttendanceReportResponse,
  type AttendanceStatsResponse,
  type CheckOutResponse,
} from './AttendanceApi';

/**
 * Concrete implementation of AttendanceRepository.
 *
 * Calls the low-level AttendanceApi and maps raw backend DTO responses
 * into domain models. Backend response structures never leak outside
 * the infrastructure layer.
 */
export class AttendanceApiRepository implements AttendanceRepository {
  async getAttendance(filters?: AttendanceFilters): Promise<AttendancePage> {
    const response = await attendanceApi.getAttendance({
      date: filters?.date,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      search: filters?.search,
      page: filters?.page,
      size: filters?.size,
    });
    return this.toAttendancePage(response);
  }

  async getAttendanceStats(): Promise<AttendanceStats> {
    const response = await attendanceApi.getStats();
    return this.toAttendanceStats(response);
  }

  async getAttendanceReport(range?: ReportRange): Promise<AttendanceReport> {
    const response = await attendanceApi.getReport({
      startDate: range?.startDate,
      endDate: range?.endDate,
    });
    return this.toAttendanceReport(response);
  }

  async checkout(id: number): Promise<CheckOutResult> {
    const response = await attendanceApi.checkout(id);
    return this.toCheckOutResult(response);
  }


  // ── Mappers ───────────────────────────────────────────────────────────────

  private toAttendancePage(response: AttendancePageResponse): AttendancePage {
    return {
      attendance: (response.items ?? []).map(item =>
        this.toAttendance(item),
      ),
      pagination: {
        page: response.page ?? 0,
        size: response.size ?? 50,
        total: response.total ?? 0,
        totalPages: response.totalPages ?? 1,
      },
    };
  }


  private toAttendance(response: AttendanceListItemResponse): Attendance {
    return {
      id: response.id,
      memberDbId: response.member_db_id,
      memberBizId: response.member_biz_id,
      memberName: response.member_name,
      photoUrl: response.photo_url,
      membershipType: response.membership_type,
      walkInName: response.walk_in_name,
      walkInPhone: response.walk_in_phone,
      walkInEmail: response.walk_in_email,
      walkInPaymentStatus: response.walk_in_payment_status,
      checkInTime: response.check_in_time,
      checkOutTime: response.check_out_time,
      totalMinutes: response.total_minutes,
      formattedDuration: response.formatted_duration,
      activityType: response.activity_type,
      status: this.toAttendanceStatus(response.status),
      type: this.toAttendanceType(response.type),
      checkInMethod: response.check_in_method,
      deviceId: response.device_id,
    };
  }

  private toAttendanceStats(
    response: AttendanceStatsResponse,
  ): AttendanceStats {
    return {
      todayVisits: response.today_visits ?? 0,
      activeNow: response.active_now ?? 0,
      avgDurationMinutes: response.avg_duration_minutes ?? 0,
      peakHour: response.peak_hour ?? '',
      attendanceRate: response.attendance_rate ?? 0,
      totalActiveMembers: response.total_active_members ?? 0,
      weeklyTrend: (response.weekly_trend ?? []).map(point => ({
        day: point.day ?? '',
        visits: point.visits ?? 0,
      })),
      monthlyTrend: (response.monthly_trend ?? []).map(point => ({
        month: point.month ?? '',
        visits: point.visits ?? 0,
      })),
    };
  }

  private toAttendanceReport(
    response: AttendanceReportResponse,
  ): AttendanceReport {
    return {
      dailySummary: (response.dailySummary ?? []).map(row => ({
        date: row.date,
        fullDate: row.fullDate,
        visits: row.visits,
        avgDuration: row.avgDuration,
      })),
      activityBreakdown: (response.activityBreakdown ?? []).map(row => ({
        type: row.type,
        count: row.count,
        percentage: row.percentage,
      })),
      peakHours: (response.peakHours ?? []).map(row => ({
        hour: row.hour,
        label: row.label,
        Sun: row.Sun,
        Mon: row.Mon,
        Tue: row.Tue,
        Wed: row.Wed,
        Thu: row.Thu,
        Fri: row.Fri,
        Sat: row.Sat,
      })),
      monthlyTrend: (response.monthlyTrend ?? []).map(row => ({
        month: row.month,
        visits: row.visits,
      })),
      topConsistentMembers: (response.topConsistentMembers ?? []).map(row => ({
        id: row.id,
        name: row.name,
        visits: row.visits,
        attendanceRate: row.attendanceRate,
      })),
      irregularMembers: (response.irregularMembers ?? []).map(row => ({
        id: row.id,
        name: row.name,
        visits: row.visits,
        attendanceRate: row.attendanceRate,
      })),
      facilityBreakdown: (response.facilityBreakdown ?? []).map(row => ({
        name: row.name,
        value: row.value,
        count: row.count,
        color: row.color,
      })),
      insights: (response.insights ?? []).map(insight => ({
        id: insight.id,
        type: insight.type,
        title: insight.title,
        message: insight.message,
      })),
      summary: response.summary
        ? {
            totalVisits: response.summary.totalVisits,
            avgDailyVisits: response.summary.avgDailyVisits,
            attendanceRate: response.summary.attendanceRate,
            peakHour: response.summary.peakHour,
            totalActiveMembers: response.summary.totalActiveMembers,
            daysInRange: response.summary.daysInRange,
          }
        : undefined,
    };
  }

  private toCheckOutResult(response: CheckOutResponse): CheckOutResult {
    return {
      success: response.success ?? false,
      message: response.message,
      attendanceId: response.attendance_id,
      checkOutTime: response.check_out_time,
      totalMinutes: response.total_minutes,
      formattedDuration: response.formatted_duration,
    };
  }

  // ── Enum mappers ──────────────────────────────────────────────────────────

  private toAttendanceStatus(value?: string): AttendanceStatus | undefined {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'active') return AttendanceStatus.Active;
    if (normalized === 'completed') return AttendanceStatus.Completed;
    return undefined;
  }

  private toAttendanceType(value?: string): AttendanceType | undefined {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'member') return AttendanceType.Member;
    if (normalized === 'walk_in') return AttendanceType.WalkIn;
    return undefined;
  }
}