import { apiClient } from '@/core/network/apiClient';
import type { MobileStaffSessionRequestDTO, MobileStaffSessionResponseDTO } from '../domain/StaffClassTypes';

export class ApiStaffClassRepository {
  /**
   * POST /api/sessions
   * Creates a new class session using the Staff UI workflow.
   */
  async createClass(request: MobileStaffSessionRequestDTO): Promise<MobileStaffSessionResponseDTO> {
    const payload = {
      name: request.name,
      type: request.type,
      trainer_id: request.trainerId,
      date: request.date,
      start_time: request.startTime,
      end_time: request.endTime,
      duration_minutes: request.durationMinutes,
      location: request.location,
      capacity: request.capacity,
      price: request.price,
      status: request.status,
      description: request.description,
    };
    const response = await apiClient.post<MobileStaffSessionResponseDTO>('/sessions', payload);
    return response.data;
  }

  /**
   * PUT /api/sessions/{id}
   */
  async updateClass(id: string, request: MobileStaffSessionRequestDTO): Promise<MobileStaffSessionResponseDTO> {
    const payload = {
      name: request.name,
      type: request.type,
      trainer_id: request.trainerId,
      date: request.date,
      start_time: request.startTime,
      end_time: request.endTime,
      duration_minutes: request.durationMinutes,
      location: request.location,
      capacity: request.capacity,
      price: request.price,
      status: request.status,
      description: request.description,
    };
    const response = await apiClient.put<MobileStaffSessionResponseDTO>(`/sessions/${id}`, payload);
    return response.data;
  }

  /**
   * DELETE /api/sessions/{id}
   */
  async deleteClass(id: string): Promise<void> {
    await apiClient.delete(`/sessions/${id}`);
  }
}

export const staffClassRepository = new ApiStaffClassRepository();
