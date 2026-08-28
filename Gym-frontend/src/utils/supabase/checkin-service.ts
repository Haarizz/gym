import { authService } from './auth-service';
import type { PaymentSplitLeg } from './billing-service';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

// ── Request / Response types ─────────────────────────────────────────────────

export interface CheckInRequest {
  method: 'qr' | 'face' | 'manual' | 'app';
  qr_code?: string;
  face_id?: string;
  member_id?: number;
  booking_id?: number;
  device_id?: string;
  notes?: string;
}

export interface CheckInResponse {
  success: boolean;
  message: string;
  attendance_id: number;
  member_name: string;
  member_id: string;
  membership_status: string;
  check_in_time: string;
  check_in_method: string;
  resolved_by: string;
}

export interface CheckOutResponse {
  success: boolean;
  message: string;
  attendance_id: number;
  check_out_time: string;
  total_minutes: number;
  formatted_duration: string;
}

export interface TodayAttendanceRecord {
  id: number;
  member_id: number;
  member_biz_id: string;
  member_name: string;
  photo_url?: string;
  membership_type: string;
  membership_status: string;
  check_in_time: string;
  check_in_method: string;
  device_id: string;
  resolved_by: string;
  check_out_time?: string;
  total_minutes?: number;
  formatted_duration?: string;
  status: 'active' | 'completed';
  type: 'member' | 'walk_in';
}

export interface WalkInCheckInRequest {
  name: string;
  phone: string;
  email?: string;
  session_type?: string;
  payment_status?: string;
  // The day-pass amount actually charged — when payment_status is "paid" and
  // this is positive, the backend posts it to the ledger as service revenue.
  amount?: number;
  payment_method?: string;
  // How the payment was actually received — card type, cheque number/bank/date,
  // bank account, or online payment provider — same shape as a member's payment.
  payment_breakdown?: PaymentSplitLeg[];
  device_id?: string;
  notes?: string;
  // Which staff member actually handled this walk-in — credited toward their
  // revenue target regardless of which account is logged in.
  processed_by_staff_id?: number;
}

// ── Service ──────────────────────────────────────────────────────────────────

class CheckInService {

  async checkIn(req: CheckInRequest): Promise<CheckInResponse> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/checkin`,
      { method: 'POST', body: JSON.stringify(req) }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Check-in failed: ${res.status}`);
    return data;
  }

  async checkout(attendanceId: number): Promise<CheckOutResponse> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/attendance/${attendanceId}/checkout`,
      { method: 'POST' }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Checkout failed: ${res.status}`);
    return data;
  }

  async walkInCheckIn(req: WalkInCheckInRequest): Promise<CheckInResponse> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE}/attendance/walkin`,
      { method: 'POST', body: JSON.stringify(req) }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Walk-in failed: ${res.status}`);
    return data;
  }

  async getTodayAttendance(): Promise<TodayAttendanceRecord[]> {
    const res = await authService.makeAuthenticatedRequest(`${BASE}/checkin/today`);
    if (!res.ok) throw new Error(`Failed to fetch today's attendance: ${res.status}`);
    return res.json();
  }
}

export const checkInService = new CheckInService();
