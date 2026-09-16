import { MobileReferralProfile, ClaimReferralRequest, ClaimReferralResponse, MobileReferralAttribution, MyReferralClaim, MobileReferralStatus } from '../domain/types';

export interface MemberReferralsRepository {
  getMyProfile(): Promise<MobileReferralProfile>;
  claimCode(request: ClaimReferralRequest): Promise<ClaimReferralResponse>;
  getHistory(): Promise<MobileReferralAttribution[]>;
  getMyClaim(): Promise<MyReferralClaim | null>;
  retryMyClaim(): Promise<MobileReferralStatus>;
}
