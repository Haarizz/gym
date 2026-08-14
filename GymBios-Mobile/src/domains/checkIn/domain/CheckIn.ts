export interface CheckInRequest {
  qr?: string;
  faceId?: string;
  memberId?: number;
  deviceId?: string;
  name?: string;
  phone?: string;
  email?: string;
  sessionType?: string;
  paymentStatus?: string;
  amount?: number;
  paymentMethod?: string;
  notes?: string;
}

export interface CheckInResult {
  success: boolean;
  message?: string;
  attendanceId?: number;
  memberName?: string;
  memberId?: string;
  membershipStatus?: string;
  checkInTime?: string;
  checkInMethod?: string;
  resolvedBy?: string;
}
