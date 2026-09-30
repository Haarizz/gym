import { apiClient } from '@/core/network/apiClient';
import { MemberReferralsRepository } from '../../application/MemberReferralsRepository';
import {
  MobileReferralProfile,
  ClaimReferralRequest,
  ClaimReferralResponse,
  MobileReferralAttribution,
  MyReferralClaim,
  MobileReferralStatus,
  MyReferralReward,
  PassContext,
} from '../../domain/types';

// Wire format is snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE on the backend).
interface MyReferralRewardResponseDTO {
  id: number;
  reward_name: string;
  reward_type: string;
  reward_value: number | null;
  currency: string | null;
  status: string;
  generated_date: string | null;
  redeemed_date: string | null;
  reward_code?: string | null;
  reward_unit?: 'PERCENT' | 'AMOUNT' | null;
  coupon_code?: string | null;
  expiry_date?: string | null;
}

function mapReward(r: MyReferralRewardResponseDTO): MyReferralReward {
  return {
    id: r.id,
    rewardName: r.reward_name,
    rewardType: r.reward_type,
    rewardValue: r.reward_value,
    currency: r.currency,
    status: r.status as MyReferralReward['status'],
    generatedDate: r.generated_date,
    redeemedDate: r.redeemed_date,
    rewardCode: r.reward_code ?? null,
    rewardUnit: r.reward_unit ?? null,
    couponCode: r.coupon_code ?? null,
    expiryDate: r.expiry_date ?? null,
  };
}

export class ApiMemberReferralsRepository implements MemberReferralsRepository {
  async getMyProfile(): Promise<MobileReferralProfile> {
    const response = await apiClient.get<MobileReferralProfile>('/mobile/referrals/me');
    return response.data;
  }

  async claimCode(request: ClaimReferralRequest): Promise<ClaimReferralResponse> {
    const response = await apiClient.post<ClaimReferralResponse>('/mobile/referrals/claim', request, {
      // The claim screen shows the backend's reason inline; the global toast would only
      // say "Request failed with status code 400" (this endpoint's body uses `error`, not `message`).
      skipGlobalErrorToast: true,
    });
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

  async getMyRewards(): Promise<MyReferralReward[]> {
    const response = await apiClient.get<MyReferralRewardResponseDTO[]>('/mobile/referrals/my-rewards');
    return response.data.map(mapReward);
  }

  async getMyPasses(context: PassContext): Promise<MyReferralReward[]> {
    const response = await apiClient.get<MyReferralRewardResponseDTO[]>('/mobile/referrals/my-passes', {
      params: { context },
    });
    return response.data.map(mapReward);
  }
}

export const apiMemberReferralsRepository = new ApiMemberReferralsRepository();
