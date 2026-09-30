export type RewardStatus = 'PENDING' | 'AVAILABLE' | 'CLAIMED' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';

export type RewardType =
  | 'WALLET_CREDIT'
  | 'MEMBERSHIP_EXTENSION'
  | 'MEMBERSHIP_DISCOUNT'
  | 'FREE_PT'
  | 'FREE_CLASS'
  | 'COUPON'
  | 'LOYALTY_POINTS'
  | 'GIFT'
  | 'CASH';

export type RewardMemberType = 'REFERRER' | 'REFEREE';

// Reward types that are only spent by picking them at renewal/booking — never via "Redeem".
export const REWARD_PASS_TYPES: RewardType[] = ['MEMBERSHIP_DISCOUNT', 'FREE_PT', 'FREE_CLASS'];

export interface ReferralReward {
  id: number;
  rewardCode: string;
  referralId?: number;
  memberId: string;
  memberType?: RewardMemberType;
  rewardName?: string;
  rewardType: RewardType;
  rewardValue?: number | null;
  currency?: string | null;
  rewardUnit?: 'PERCENT' | 'AMOUNT' | null;
  status: RewardStatus;
  approvalRequired?: boolean;
  approvedBy?: string | null;
  generatedDate?: string | null;
  expiryDate?: string | null;
  redeemedDate?: string | null;
  remarks?: string | null;
}

export interface RewardListParams {
  page?: number;
  size?: number;
  status?: RewardStatus;
  rewardType?: RewardType;
  search?: string;
}

export interface RewardPage {
  rewards: ReferralReward[];
  totalItems: number;
  totalPages: number;
}
