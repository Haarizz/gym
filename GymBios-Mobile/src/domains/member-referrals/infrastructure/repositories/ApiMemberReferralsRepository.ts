import { apiClient } from '@/core/network/apiClient';
import { MemberReferralsRepository } from '../../application/MemberReferralsRepository';
import {
  MobileReferralProfile,
  ClaimReferralRequest,
  ClaimReferralResponse,
  MobileReferralAttribution,
  MyReferralClaim,
  MobileReferralStatus,
} from '../../domain/types';

export class ApiMemberReferralsRepository implements MemberReferralsRepository {
  async getMyProfile(): Promise<MobileReferralProfile> {
    const response = await apiClient.get<MobileReferralProfile>('/mobile/referrals/me');
    return response.data;
  }

  async claimCode(request: ClaimReferralRequest): Promise<ClaimReferralResponse> {
    const response = await apiClient.post<ClaimReferralResponse>('/mobile/referrals/claim', request);
    return response.data;
  }

  async getHistory(): Promise<MobileReferralAttribution[]> {
    const response = await apiClient.get<MobileReferralAttribution[]>('/mobile/referrals/history');
    return response.data;
  }

  async getMyClaim(): Promise<MyReferralClaim | null> {
    const response = await apiClient.get<MyReferralClaim>('/mobile/referrals/my-claim');
    return response.status === 204 ? null : response.data;
  }

  async retryMyClaim(): Promise<MobileReferralStatus> {
    const response = await apiClient.post<{ status: MobileReferralStatus }>('/mobile/referrals/my-claim/retry');
    return response.data.status;
  }
}

export const apiMemberReferralsRepository = new ApiMemberReferralsRepository();
