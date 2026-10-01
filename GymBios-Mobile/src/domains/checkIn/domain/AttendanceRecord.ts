export interface AttendanceRecord {
  id: number;
  memberDbId?: number;
  memberBizId?: string;
  memberName?: string;
  photoUrl?: string;
  membershipType?: string;
  walkInName?: string;
  walkInPhone?: string;
  walkInEmail?: string;
  walkInPaymentStatus?: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalMinutes?: number;
  formattedDuration?: string;
  activityType?: string;
  status?: string;
  type?: string;
  checkInMethod?: string;
  deviceId?: string;
}

/**
 * A visit is still open (member in the gym) until it has a check-out time. The API
 * sends check_out_time: null for open visits, mapped here to checkOutTime.
 */
export function isOpenVisit(record: AttendanceRecord): boolean {
  return !record.checkOutTime;
}
