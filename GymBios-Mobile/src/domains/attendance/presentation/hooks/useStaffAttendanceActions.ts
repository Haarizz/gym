import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/core/platform/api/httpClient';

export interface ClockInRequest {
  staff_id: number;
  device_id?: string;
}

export interface ClockOutResponse {
  message: string;
  attendance_id?: number;
  clock_out_time?: string;
  formatted_duration?: string;
}

export function useStaffClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ClockInRequest) => {
      const response = await httpClient.post('/staff/attendance/clock-in', request);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff'] });
    },
  });
}

export function useStaffClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    // We'll use the query-param route since we have the staffId
    mutationFn: async (staffId: number): Promise<ClockOutResponse> => {
      const response = await httpClient.post(`/staff/attendance/clock-out?staff_id=${staffId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'staff'] });
    },
  });
}
