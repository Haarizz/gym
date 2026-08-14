import type {
  CheckInRequest,
  CheckInResult,
  CheckInStatus,
  DeviceKey,
  AttendanceRecord,
} from '../domain';

export interface CheckInRepository {
  checkIn(request: CheckInRequest): Promise<CheckInResult>;
  getStatus(qr?: string, faceId?: string, memberId?: number): Promise<CheckInStatus>;
  getTodayAttendance(): Promise<AttendanceRecord[]>;
  createDeviceKey(name: string): Promise<DeviceKey>;
  revokeDeviceKey(name: string): Promise<void>;
}
