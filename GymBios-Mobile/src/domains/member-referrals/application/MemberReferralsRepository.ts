import { MobileReferralProfile, ClaimReferralRequest, ClaimReferralResponse, MobileReferralAttribution, MyReferralClaim, MobileReferralStatus, MyReferralReward, PassContext } from '../domain/types';

export interface MemberReferralsRepository {
  getMyProfile(): Promise<MobileReferralProfile>;
  claimCode(request: ClaimReferralRequest): Promise<ClaimReferralResponse>;
  getHistory(): Promise<MobileReferralAttribution[]>;
  getMyClaim(): Promise<MyReferralClaim | null>;
  retryMyClaim(): Promise<MobileReferralStatus>;
  getMyRewards(): Promise<MyReferralReward[]>;
  getMyPasses(context: PassContext): Promise<MyReferralReward[]>;
}
