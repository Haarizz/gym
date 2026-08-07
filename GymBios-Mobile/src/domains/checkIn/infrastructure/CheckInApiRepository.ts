import type {
  CheckInRequest,
  CheckInResult,
  CheckInStatus,
  DeviceKey,
  AttendanceRecord,
} from '../domain';
import type { CheckInRepository } from '../application/CheckInRepository';
import {
  checkInApi,
  type CheckInApiRequest,
  type CheckInApiResponse,
  type CheckInStatusApiResponse,
  type AttendanceRecordApiResponse,
} from './CheckInApi';

export class CheckInApiRepository implements CheckInRepository {
  async checkIn(request: CheckInRequest): Promise<CheckInResult> {
    const apiRequest: CheckInApiRequest = {
      qr: request.qr,
      face_id: request.faceId,
      member_id: request.memberId,
      device_id: request.deviceId,
      name: request.name,
      phone: request.phone,
      email: request.email,
      session_type: request.sessionType,
      payment_status: request.paymentStatus,
      amount: request.amount,
      payment_method: request.paymentMethod,
      notes: request.notes,
    };
    const response = await checkInApi.checkIn(apiRequest);
    return this.toCheckInResult(response);
  }

  async getStatus(qr?: string, faceId?: string, memberId?: number): Promise<CheckInStatus> {
    const response = await checkInApi.getStatus({ qr, face_id: faceId, member_id: memberId });
    return this.toCheckInStatus(response);
  }

  async getTodayAttendance(): Promise<AttendanceRecord[]> {
    const response = await checkInApi.getTodayAttendance();
    return response.map(record => this.toAttendanceRecord(record));
  }

  async createDeviceKey(name: string): Promise<DeviceKey> {
    const response = await checkInApi.createDeviceKey(name);
    return {
      name: response.name,
      key: response.key,
      message: response.message,
    };
  }

  async revokeDeviceKey(name: string): Promise<void> {
    await checkInApi.revokeDeviceKey(name);
  }

  private toCheckInResult(response: CheckInApiResponse): CheckInResult {
    return {
      success: response.success ?? false,
      message: response.message,
      attendanceId: response.attendance_id,
      memberName: response.member_name,
      memberId: response.member_id,
      membershipStatus: response.membership_status,
      checkInTime: response.check_in_time,
      checkInMethod: response.check_in_method,
      resolvedBy: response.resolved_by,
    };
  }

  private toCheckInStatus(response: CheckInStatusApiResponse): CheckInStatus {
    return {
      status: response.status,
      message: response.message,
      memberId: response.member_id,
      memberName: response.member_name,
      photoUrl: response.photo_url,
    };
  }

  private toAttendanceRecord(response: AttendanceRecordApiResponse): AttendanceRecord {
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
      status: response.status,
      type: response.type,
      checkInMethod: response.check_in_method,
      deviceId: response.device_id,
    };
  }
}
