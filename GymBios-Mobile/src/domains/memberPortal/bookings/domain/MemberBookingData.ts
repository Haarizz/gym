export interface MemberBookingData {
  id: number;
  classId: number;
  className: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string;
  status: string;
  capacity: number;
  availableSpots: number;
  canCancel: boolean;
}

export interface BookingStatsData {
  upcoming: number;
  thisWeek: number;
  attended: number;
}

export interface AvailableClassData {
  classId: number;
  className: string;
  trainerName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string;
  capacity: number;
  availableSpots: number;
  memberBookingState: string | null;
}

export interface CreateMemberBookingRequest {
  classId: number;
}
