import { apiClient } from '@/core/network/apiClient';

export interface CheckInApiRequest {
  qr?: string;
  face_id?: string;
  member_id?: number;
  device_id?: string;
  name?: string;
  phone?: string;
  email?: string;
  session_type?: string;
  payment_status?: string;
  amount?: number;
  payment_method?: string;
  notes?: string;
}

export interface CheckInApiResponse {
  success: boolean;
  message?: string;
  attendance_id?: number;
  member_name?: string;
  member_id?: string;
  membership_status?: string;
  check_in_time?: string;
  check_in_method?: string;
  resolved_by?: string;
}

export interface CheckInStatusApiResponse {
  status: string;
  message?: string;
  member_id?: number;
  member_name?: string;
  photo_url?: string;
}

export interface AttendanceRecordApiResponse {
  id: number;
  member_db_id?: number;
  member_biz_id?: string;
  member_name?: string;
  photo_url?: string;
  membership_type?: string;
  walk_in_name?: string;
  walk_in_phone?: string;
  walk_in_email?: string;
  walk_in_payment_status?: string;
  check_in_time?: string;
  check_out_time?: string;
  total_minutes?: number;
  formatted_duration?: string;
  activity_type?: string;
  status?: string;
  type?: string;
  check_in_method?: string;
  device_id?: string;
}

export const checkInApi = {
  async checkIn(request: CheckInApiRequest): Promise<CheckInApiResponse> {
    const response = await apiClient.post<CheckInApiResponse>('/checkin', request);
    return response.data;
  },

  async getStatus(params: {
    qr?: string;
    face_id?: string;
    member_id?: number;
  }): Promise<CheckInStatusApiResponse> {
    const response = await apiClient.get<CheckInStatusApiResponse>('/checkin/status', { params });
    return response.data;
  },

  async getTodayAttendance(): Promise<AttendanceRecordApiResponse[]> {
    const response = await apiClient.get<AttendanceRecordApiResponse[]>('/checkin/today');
    return response.data;
  },

  async createDeviceKey(name: string): Promise<{ name: string; key: string; message: string }> {
    const response = await apiClient.post<{ name: string; key: string; message: string }>('/checkin/device-keys', { name });
    return response.data;
  },

  async revokeDeviceKey(name: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/checkin/device-keys/${name}`);
    return response.data;
  },
};
