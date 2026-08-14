import type { Referral } from './Referral';
import type { ReferralRule } from './ReferralRule';

export interface CreateReferralPayload {
  referrerMemberId?: string;
  referrerName: string;
  refereeName: string;
  refereeEmail?: string;
  refereePhone?: string;
  status?: string;
  rewardAmount?: number;
  date?: string;
  signupDate?: string;
  paymentDate?: string;
  notes?: string;
  ruleId?: number;
  referralCode?: string;
}

export type UpdateReferralPayload = Partial<CreateReferralPayload>;

export interface MarkSuccessfulPayload {
  purchaseAmount?: number;
  membershipPlanId?: number;
  refereeMemberId?: string;
}

export interface ReferralValidationResponse {
  referral: Referral;
  applicableRewardRules: ReferralRule[];
}
