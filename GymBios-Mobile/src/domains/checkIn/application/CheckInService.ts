import type {
  CheckInRequest,
  CheckInResult,
  CheckInStatus,
  DeviceKey,
  AttendanceRecord,
} from '../domain';
import type { CheckInRepository } from './CheckInRepository';
import type { CheckInProvider } from './CheckInProvider';

export class CheckInService {
  constructor(
    private readonly repository: CheckInRepository,
    private readonly provider: CheckInProvider,
  ) {}

  checkIn(request: CheckInRequest): Promise<CheckInResult> {
    return this.provider.checkIn(request);
  }

  getStatus(qr?: string, faceId?: string, memberId?: number): Promise<CheckInStatus> {
    return this.repository.getStatus(qr, faceId, memberId);
  }

  getTodayAttendance(): Promise<AttendanceRecord[]> {
    return this.repository.getTodayAttendance();
  }

  createDeviceKey(name: string): Promise<DeviceKey> {
    return this.repository.createDeviceKey(name);
  }

  revokeDeviceKey(name: string): Promise<void> {
    return this.repository.revokeDeviceKey(name);
  }
}
