export type MobileReferralStatus = 'PENDING' | 'SUCCESSFUL' | 'INVALID' | 'EXPIRED';

export interface MobileReferralProfile {
  // Only active gym members get a code; otherwise eligible is false and reason/message say why.
  eligible: boolean;
  referralCode?: string;
  url?: string;
  reason?: 'NO_GYM' | 'MEMBERSHIP_INACTIVE';
  message?: string;
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
  rewardCode?: string | null;
  // PERCENT / AMOUNT — how rewardValue reads for MEMBERSHIP_DISCOUNT and COUPON rewards.
  rewardUnit?: 'PERCENT' | 'AMOUNT' | null;
  // Shareable code for COUPON rewards.
  couponCode?: string | null;
  expiryDate?: string | null;
}

/** Where a Reward Pass is spent: MEMBERSHIP_DISCOUNT on renewals, FREE_PT/FREE_CLASS on bookings. */
export type PassContext = 'MEMBERSHIP' | 'PT' | 'CLASS';

/** Reward types spent by picking them at renewal/booking rather than redeemed on their own. */
export const REWARD_PASS_TYPES = ['MEMBERSHIP_DISCOUNT', 'FREE_PT', 'FREE_CLASS'];

/** What a code typed into a promo field resolved to: a gym promotion, or a shareable referral coupon. */
export interface DiscountCode {
  source: 'PROMOTION' | 'COUPON';
  promotionId: number | null;
  code: string;
  name: string;
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue: number;
  /** Server-computed discount on the amount the code was validated against; null when none was sent. */
  discountAmount: number | null;
}
