import type { Result } from '@/core/types';
import type { ProfileApiModel, UpdateProfileRequestApiModel } from '../../infrastructure/api/ProfileApiModels';
import type { ProfileApi } from '../../infrastructure/api/ProfileApi';
import type { AuthOrchestrator } from '../../../auth/application/orchestrators/AuthOrchestrator';
import { refreshSession } from '../../../auth';

export class UpdateMobileProfile {
  constructor(
    private readonly profileApi: ProfileApi,
  ) {}

  async execute(input: UpdateProfileRequestApiModel): Promise<Result<ProfileApiModel, string>> {
    try {
      const data = await this.profileApi.updateMobileProfile(input);
      // We also need to refresh the auth session so the profileCompleted flag is updated locally.
      // Doing this async after success.
      return { success: true, value: data };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to update profile' };
    }
  }
}
