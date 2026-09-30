import { apiClient } from '@/core/network/apiClient';
import type { ProfileApiModel, UpdateProfileRequestApiModel } from './ProfileApiModels';

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

/** Form fields hold height/weight as text; the backend expects numbers. */
function toNumberOrUndefined(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

  /**
   * GET /api/mobile/profile/me
   */
  async getMobileProfile(): Promise<ProfileApiModel> {
    // Background fetch (avatar photo) shared by every screen via useProfile —
    // callers fall back to a cached photo, so a failure must not toast.
    const response = await apiClient.get<any>('/mobile/profile/me', { skipGlobalErrorToast: true });
    const data = response.data;
    return {
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      nationality: data.nationality,
      address: data.address,
      emergencyContact: data.emergency_contact,
      emergencyPhone: data.emergency_phone,
      bloodType: data.blood_type,
      medicalConditions: data.medical_conditions,
      allergies: data.allergies,
      currentMedications: data.current_medications,
      chronicIllnesses: data.chronic_illnesses,
      height: data.height != null ? String(data.height) : undefined,
      weight: data.weight != null ? String(data.weight) : undefined,
      photoUrl: data.photo_url,
    };
  }

  /**
   * PUT /api/mobile/profile/me
   */
  async updateMobileProfile(payload: UpdateProfileRequestApiModel): Promise<ProfileApiModel> {
    const apiPayload = {
      full_name: payload.fullName,
      phone: payload.phone,
      date_of_birth: payload.dateOfBirth,
      gender: payload.gender,
      nationality: payload.nationality,
      address: payload.address,
      emergency_contact: payload.emergencyContact,
      emergency_phone: payload.emergencyPhone,
      blood_type: payload.bloodType,
      medical_conditions: payload.medicalConditions,
      allergies: payload.allergies,
      current_medications: payload.currentMedications,
      chronic_illnesses: payload.chronicIllnesses,
      height: toNumberOrUndefined(payload.height),
      weight: toNumberOrUndefined(payload.weight),
      photo_url: payload.photoUrl,
    };
    const response = await apiClient.put<any>('/mobile/profile/me', apiPayload);
    const data = response.data;
    return {
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      nationality: data.nationality,
      address: data.address,
      emergencyContact: data.emergency_contact,
      emergencyPhone: data.emergency_phone,
      bloodType: data.blood_type,
      medicalConditions: data.medical_conditions,
      allergies: data.allergies,
      currentMedications: data.current_medications,
      chronicIllnesses: data.chronic_illnesses,
      height: data.height != null ? String(data.height) : undefined,
      weight: data.weight != null ? String(data.weight) : undefined,
      photoUrl: data.photo_url,
    };
  }

  /**
   * PUT /api/mobile/profile/me (partial — photo only)
   */
  async updatePhotoUrl(photoUrl: string): Promise<string> {
    const response = await apiClient.put<any>('/mobile/profile/me', { photo_url: photoUrl });
    return response.data.photo_url;
  }

  /**
   * GET /api/mobile/profile/transactions
   */
  async getTransactions(): Promise<any> {
    const response = await apiClient.get<any>('/mobile/profile/transactions');
    return response.data;
  }
}
