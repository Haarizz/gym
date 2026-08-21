export interface MobileSessionRequestDTO {
  name: string;
  type: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location?: string;
  capacity?: number;
  price?: number;
  status?: string;
  description?: string;
  member_id?: number | string;
}

export interface TrainerSessionItem {
  id?: string | number;
  time: string;
  member: string;
  type: string;
  duration: string;
  // Extra fields for editing
  name?: string;
  date?: string; // yyyy-MM-dd
  rawStartTime?: string; // HH:mm:ss or HH:mm
  rawEndTime?: string; // HH:mm:ss or HH:mm
  location?: string;
  capacity?: number;
  price?: number;
  status?: string;
  description?: string;
  memberId?: number | string;
}

export interface TrainerDaySchedule {
  day: string;
  date: number;
  sessions: TrainerSessionItem[];
}

export interface TrainerScheduleStats {
  thisWeek: number;
  nextWeek: number;
  openSlots: number;
}

export interface TrainerScheduleData {
  dateRange: string;
  totalSessions: number;
  stats: TrainerScheduleStats;
  weekSchedule: TrainerDaySchedule[];
}

export interface MobileScheduleSlotDTO {
  day: string;
  slot: string;
}

export interface MobileAvailabilityDTO {
  slots: MobileScheduleSlotDTO[];
}
