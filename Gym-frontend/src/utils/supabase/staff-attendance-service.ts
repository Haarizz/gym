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

  async getAttendance(date?: string, search?: string, page = 0, size = 50): Promise<AttendanceListResponse> {
    const params = new URLSearchParams();
    if (date)   params.append('date', date);
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

  async checkout(attendanceId: number) {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/attendance/${attendanceId}/checkout`,
      { method: 'POST' }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Checkout failed');
    return data;
  }
}

export const staffAttendanceService = new StaffAttendanceService();
