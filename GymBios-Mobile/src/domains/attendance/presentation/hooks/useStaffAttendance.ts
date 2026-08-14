import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { httpClient } from '@/core/platform/api/httpClient';

/**
 * A single staff / trainer attendance record.
 *
 * Mirrors the backend `GET /staff/attendance/today` response
 * (snake_case DTO) but normalised to camelCase for the presentation layer.
 */
export interface StaffAttendanceRecord {
  id: number;
  staffDbId: number;
  staffBizId: string;
  staffName: string;
  staffRole: string;
  staffDepartment?: string;
  photoUrl?: string;
  clockInTime: string;
  clockOutTime?: string;
  totalMinutes?: number;
  formattedDuration?: string;
  status: 'working' | 'completed';
  deviceId?: string;
}

/** Raw snake_case DTO from the backend. */
interface StaffAttendanceResponse {
  id: number;
  staff_db_id: number;
  staff_biz_id: string;
  staff_name: string;
  staff_role: string;
  staff_department?: string;
  photo_url?: string;
  clock_in_time: string;
  clock_out_time?: string;
  total_minutes?: number;
  formatted_duration?: string;
  status: 'working' | 'completed';
  device_id?: string;
}

const STAFF_ATTENDANCE_KEY = ['attendance', 'staff', 'today'] as const;

/**
 * Presentation hook that fetches today's staff & trainer attendance.
 *
 * Uses the core `httpClient` (which includes JWT auth interceptors) since
 * the attendance domain's infrastructure layer does not yet expose a
 * staff-attendance endpoint.  Response mapping happens here so snake_case
 * DTOs never leak into the presentation components.
 */
export function useStaffAttendance() {
  const query = useQuery({
    queryKey: STAFF_ATTENDANCE_KEY,
    queryFn: async (): Promise<StaffAttendanceRecord[]> => {
      const response = await httpClient.get<StaffAttendanceResponse[]>(
        '/staff/attendance/today',
      );
      return (response.data ?? []).map(toStaffAttendanceRecord);
    },
    staleTime: 60_000,
  });

  const staffRecords = query.data ?? [];
  const loading = query.isFetching;
  const error = query.error as Error | null;

  const refresh = useCallback(() => query.refetch(), [query]);

  return { staffRecords, loading, error, refresh };
}

function toStaffAttendanceRecord(
  dto: StaffAttendanceResponse,
): StaffAttendanceRecord {
  return {
    id: dto.id,
    staffDbId: dto.staff_db_id,
    staffBizId: dto.staff_biz_id,
    staffName: dto.staff_name,
    staffRole: dto.staff_role,
    staffDepartment: dto.staff_department,
    photoUrl: dto.photo_url,
    clockInTime: dto.clock_in_time,
    clockOutTime: dto.clock_out_time,
    totalMinutes: dto.total_minutes,
    formattedDuration: dto.formatted_duration,
    status: dto.status,
    deviceId: dto.device_id,
  };
}
