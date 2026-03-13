import { authService } from './auth-service';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface AttendanceRecord {
  id: string;
  member_id: string;
  member_name: string;
  check_in_time: string;
  check_out_time?: string | null;
  duration_minutes?: number | null;
  created_at: string;
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

    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/attendance?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch attendance: ${response.status}`);
    return response.json();
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

  async getMemberAttendanceHistory(memberId: string): Promise<AttendanceRecord[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/attendance/member/${memberId}`
    );
    if (!response.ok) throw new Error(`Failed to fetch attendance history: ${response.status}`);
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
}

export const attendanceService = new AttendanceService();
