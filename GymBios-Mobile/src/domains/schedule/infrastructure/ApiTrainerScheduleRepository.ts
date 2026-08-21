import { apiClient } from '@/core/network/apiClient';
import type { TrainerScheduleData, MobileSessionRequestDTO, MobileAvailabilityDTO } from '../domain/TrainerScheduleData';
import { format, parseISO } from 'date-fns';

export class ApiTrainerScheduleRepository {
  static async getSchedule(startDate: string, endDate: string): Promise<TrainerScheduleData> {
    const response = await apiClient.get('/mobile/schedule', {
      params: { startDate, endDate },
    });

    const data = response.data;

    return {
      dateRange: `${format(parseISO(data.start_date), 'MMMM d')} - ${format(parseISO(data.end_date), 'd, yyyy')}`,
      totalSessions: data.total_sessions,
      stats: {
        thisWeek: data.total_sessions,
        nextWeek: 0,
        openSlots: 0, // Explicitly left undefined/zero per business rule
      },
      weekSchedule: (data.days || []).map((day: any) => ({
        day: format(parseISO(day.date), 'EEE'),
        date: parseInt(format(parseISO(day.date), 'd'), 10),
        sessions: (day.sessions || []).map((session: any) => ({
          id: session.id,
          time: format(parseISO(`1970-01-01T${session.start_time}`), 'hh:mm a'),
          member: session.name || session.member_name || 'Class',
          type: session.type?.toUpperCase() || 'CLASS',
          duration: `${session.duration_minutes || 60} min`,
          // Extra fields for edit
          name: session.name || session.member_name,
          date: day.date,
          rawStartTime: session.start_time,
          rawEndTime: session.end_time,
          location: session.location,
          capacity: session.capacity,
          price: session.price,
          status: session.status,
          description: session.description,
          memberId: session.member_id,
        })),
      })),
    };
  }

  static async createSession(request: MobileSessionRequestDTO): Promise<any> {
    const response = await apiClient.post('/mobile/schedule/sessions', request);
    return response.data;
  }

  static async updateSession(id: string | number, request: MobileSessionRequestDTO): Promise<any> {
    const response = await apiClient.put(`/mobile/schedule/sessions/${id}`, request);
    return response.data;
  }

  static async deleteSession(id: string | number): Promise<void> {
    await apiClient.delete(`/mobile/schedule/sessions/${id}`);
  }

  static async getAvailability(): Promise<MobileAvailabilityDTO> {
    const response = await apiClient.get('/mobile/schedule/availability');
    return response.data;
  }

  static async updateAvailability(request: MobileAvailabilityDTO): Promise<MobileAvailabilityDTO> {
    const response = await apiClient.put('/mobile/schedule/availability', request);
    return response.data;
  }
}
