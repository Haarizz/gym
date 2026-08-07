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
