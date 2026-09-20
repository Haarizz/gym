export type MobileReferralStatus = 'PENDING' | 'SUCCESSFUL' | 'INVALID' | 'EXPIRED';

export interface MobileReferralProfile {
  referralCode: string;
  url: string;
}

export interface MobileReferralAttribution {
  id: number;
  referrerGlobalUserId: number;
  refereeGlobalUserId: number;
  status: MobileReferralStatus;
  legacyReferralId?: number;
  createdAt: string;
}

export interface ClaimReferralRequest {
  code: string;
}

export interface ClaimReferralResponse {
  status: MobileReferralStatus;
  message: string;
  tenantSlug: string;
}

/** The code the current user claimed as a referee, if any. */
export interface MyReferralClaim {
  referrerName: string;
  status: MobileReferralStatus;
  claimedAt: string;
  canRetry: boolean;
}

export type MyReferralRewardStatus = 'PENDING' | 'AVAILABLE' | 'CLAIMED' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';

/** One of the current user's own referral rewards, as referrer or referee. */
export interface MyReferralReward {
  id: number;
  rewardName: string;
  rewardType: string;
  rewardValue: number | null;
  currency: string | null;
  status: MyReferralRewardStatus;
  generatedDate: string | null;
  redeemedDate: string | null;
}
