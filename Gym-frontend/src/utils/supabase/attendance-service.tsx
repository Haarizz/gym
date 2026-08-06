import { authService } from './auth-service';
import { parseApiError } from './api-error';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface AttendanceReportSettings {
  enabled: boolean;
  recipient_email?: string | null;
  gym_capacity?: number | null;
}

export interface AttendanceRecord {
  id: string;
  member_id: string;
  member_name: string;
  check_in_time: string;
  check_out_time?: string | null;
  duration_minutes?: number | null;
  created_at: string;
}

// Mirrors the backend's AttendanceListItemDTO (global Jackson SNAKE_CASE
// strategy) — used by GET /api/attendance/member/{id}, which returns a bare
// array, not the paginated { items, ... } envelope GET /api/attendance uses.
export interface AttendanceListItem {
  id: number;
  member_db_id?: number | null;
  member_biz_id?: string | null;
  member_name?: string | null;
  photo_url?: string | null;
  membership_type?: string | null;
  walk_in_name?: string | null;
  walk_in_phone?: string | null;
  walk_in_email?: string | null;
  walk_in_payment_status?: string | null;
  check_in_time: string;
  check_out_time?: string | null;
  total_minutes?: number | null;
  formatted_duration?: string | null;
  activity_type?: string | null;
  status: string;
  type: string;
  check_in_method?: string | null;
  device_id?: string | null;
}

export interface AttendanceStats {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  averageDuration: number;
  peakHours: Record<string, number>;
}

class AttendanceService {

  async getAttendance(date?: string): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    // The backend paginates (default size=50) — callers here want the full
    // day's list to filter/reduce over, not just the first page.
    params.append('size', '1000');

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/attendance?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch attendance: ${response.status}`);
    // GET /api/attendance returns a paginated envelope
    // { items, total, page, size, totalPages }, not a bare array.
    const body = await response.json();
    return Array.isArray(body) ? body : (body?.items ?? []);
  }

  async checkIn(memberId: string, memberName: string): Promise<AttendanceRecord> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/attendance/checkin`,
      { method: 'POST', body: JSON.stringify({ member_id: memberId, member_name: memberName }) }
    );
    if (!response.ok) throw new Error(`Check-in failed: ${response.status}`);
    return response.json();
  }

  async checkOut(memberId: string): Promise<AttendanceRecord> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/attendance/checkout`,
      { method: 'POST', body: JSON.stringify({ member_id: memberId }) }
    );
    if (!response.ok) throw new Error(`Check-out failed: ${response.status}`);
    return response.json();
  }

  async getCurrentlyCheckedIn(): Promise<AttendanceRecord[]> {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getAttendance(today);
    return records.filter(r => !r.check_out_time);
  }

  async isMemberCheckedIn(memberId: string): Promise<boolean> {
    const checkedIn = await this.getCurrentlyCheckedIn();
    return checkedIn.some(r => r.member_id === memberId);
  }

  async getMemberAttendanceHistory(memberDbId: string | number): Promise<AttendanceListItem[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/attendance/member/${memberDbId}`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch attendance history: ${response.status}`));
    return response.json();
  }

  async getAttendanceStats(): Promise<AttendanceStats> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const records = await this.getAttendance(today);

      const completed = records.filter(r => r.check_out_time);
      const avgDuration = completed.length > 0
        ? completed.reduce((sum, r) => sum + (r.duration_minutes || 0), 0) / completed.length
        : 0;

      const peakHours: Record<string, number> = {};
      records.forEach(r => {
        const hour = new Date(r.check_in_time).getHours();
        const key  = `${hour}:00`;
        peakHours[key] = (peakHours[key] || 0) + 1;
      });

      return {
        totalToday:      records.length,
        totalThisWeek:   records.length,  // will be replaced when /attendance/stats endpoint is built
        totalThisMonth:  records.length,
        averageDuration: Math.round(avgDuration),
        peakHours,
      };
    } catch {
      return { totalToday: 0, totalThisWeek: 0, totalThisMonth: 0, averageDuration: 0, peakHours: {} };
    }
  }

  async getReportSettings(): Promise<AttendanceReportSettings> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/attendance/report-settings`
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to fetch report settings: ${response.status}`));
    return response.json();
  }

  async updateReportSettings(settings: AttendanceReportSettings): Promise<AttendanceReportSettings> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/attendance/report-settings`,
      { method: 'PUT', body: JSON.stringify(settings) }
    );
    if (!response.ok) throw new Error(await parseApiError(response, `Failed to update report settings: ${response.status}`));
    return response.json();
  }
}

export const attendanceService = new AttendanceService();
