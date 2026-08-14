/**
 * Attendance status values.
 * Mirrors backend AttendanceListItemDTO.status values.
 */
export enum AttendanceStatus {
  Active = 'active',
  Completed = 'completed',
}

/**
 * Attendance record type.
 * Mirrors backend AttendanceListItemDTO.type values.
 */
export enum AttendanceType {
  Member = 'member',
  WalkIn = 'walk_in',
}

/**
 * A single attendance record — either a member check-in or a walk-in visit.
 * Mirrors backend AttendanceListItemDTO.
 */
export interface Attendance {
  id: number;
  // Member info (null for walk-ins)
  memberDbId?: number;
  memberBizId?: string;
  memberName?: string;
  photoUrl?: string;
  membershipType?: string;
  // Walk-in info (null for members)
  walkInName?: string;
  walkInPhone?: string;
  walkInEmail?: string;
  walkInPaymentStatus?: string;
  // Common
  checkInTime?: string;
  checkOutTime?: string;
  totalMinutes?: number;
  formattedDuration?: string;
  activityType?: string;
  status?: AttendanceStatus;
  type?: AttendanceType;
  checkInMethod?: string;
  deviceId?: string;
}