import { apiClient } from '@/core/network/apiClient';

export interface ApiAuthMeResponse {
  userId?: number;
  user_id?: number;
  username: string;
  roles: string[];
  enabled: boolean;
  staffName?: string | null;
  staff_name?: string | null;
  roleName?: string | null;
  role_name?: string | null;
  permissions?: string[];
}

export class ProfileApi {
  /**
   * GET /api/auth/me
   * Main profile endpoint from AuthController returning current authenticated user details.
   */
  async getAuthMe(): Promise<ApiAuthMeResponse> {
    const response = await apiClient.get<ApiAuthMeResponse>('/auth/me');
    return response.data;
  }

  /**
   * POST /api/auth/change-password
   * Self-service password change from AuthController.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }
}
