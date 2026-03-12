import { authService } from './auth-service';
import { projectId } from './info';

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a04502f`;

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
  // Get attendance records for a specific date
  async getAttendance(date?: string): Promise<AttendanceRecord[]> {
    try {
      const queryParams = new URLSearchParams();
      if (date) queryParams.append('date', date);

      const response = await authService.makeAuthenticatedRequest(
        `${baseUrl}/attendance?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch attendance');
      }

      return result.data;
    } catch (error) {
      console.error('Get attendance error:', error);
      throw error;
    }
  }

  // Record member check-in
  async checkIn(memberId: string, memberName: string): Promise<AttendanceRecord> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/attendance/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          member_id: memberId,
          member_name: memberName
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to record check-in');
      }

      return result.data;
    } catch (error) {
      console.error('Check-in error:', error);
      throw error;
    }
  }

  // Record member check-out
  async checkOut(memberId: string): Promise<AttendanceRecord> {
    try {
      const response = await authService.makeAuthenticatedRequest(`${baseUrl}/attendance/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          member_id: memberId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to record check-out');
      }

      return result.data;
    } catch (error) {
      console.error('Check-out error:', error);
      throw error;
    }
  }

  // Get attendance statistics
  async getAttendanceStats(): Promise<AttendanceStats> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get attendance for different periods (simplified - in production would have optimized endpoints)
      const todayAttendance = await this.getAttendance(today);
      
      // Calculate stats
      const completedSessions = todayAttendance.filter(record => record.check_out_time);
      const averageDuration = completedSessions.length > 0 
        ? completedSessions.reduce((sum, record) => sum + (record.duration_minutes || 0), 0) / completedSessions.length
        : 0;

      // Calculate peak hours (simplified)
      const peakHours: Record<string, number> = {};
      todayAttendance.forEach(record => {
        const hour = new Date(record.check_in_time).getHours();
        const hourKey = `${hour}:00`;
        peakHours[hourKey] = (peakHours[hourKey] || 0) + 1;
      });

      return {
        totalToday: todayAttendance.length,
        totalThisWeek: todayAttendance.length * 7, // Simplified calculation
        totalThisMonth: todayAttendance.length * 30, // Simplified calculation
        averageDuration: Math.round(averageDuration),
        peakHours
      };
    } catch (error) {
      console.error('Get attendance stats error:', error);
      return {
        totalToday: 0,
        totalThisWeek: 0,
        totalThisMonth: 0,
        averageDuration: 0,
        peakHours: {}
      };
    }
  }

  // Get currently checked-in members
  async getCurrentlyCheckedIn(): Promise<AttendanceRecord[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendance = await this.getAttendance(today);
      
      return attendance.filter(record => !record.check_out_time);
    } catch (error) {
      console.error('Get currently checked-in error:', error);
      return [];
    }
  }

  // Get member attendance history
  async getMemberAttendanceHistory(memberId: string, days: number = 30): Promise<AttendanceRecord[]> {
    try {
      // In a full implementation, this would query multiple days
      // For now, return today's data if member matches
      const today = new Date().toISOString().split('T')[0];
      const attendance = await this.getAttendance(today);
      
      return attendance.filter(record => record.member_id === memberId);
    } catch (error) {
      console.error('Get member attendance history error:', error);
      return [];
    }
  }

  // Check if member is currently checked in
  async isMemberCheckedIn(memberId: string): Promise<boolean> {
    try {
      const checkedIn = await this.getCurrentlyCheckedIn();
      return checkedIn.some(record => record.member_id === memberId);
    } catch (error) {
      console.error('Check member status error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const attendanceService = new AttendanceService();
