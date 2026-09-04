import type { Result } from '@/core/types';
import type { ProfileApiModel } from '../../infrastructure/api/ProfileApiModels';
import type { ProfileApi } from '../../infrastructure/api/ProfileApi';

export class GetMobileProfile {
  constructor(private readonly profileApi: ProfileApi) {}

  async execute(): Promise<Result<ProfileApiModel, string>> {
    try {
      const data = await this.profileApi.getMobileProfile();
      return { success: true, value: data };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to fetch profile' };
    }
  }
}
