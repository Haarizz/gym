export type RewardRuleType = 'discount' | 'credit' | 'points' | 'free_session';
export type RewardRuleEligibility = 'referrer' | 'referee' | 'both';
export type RewardRuleCondition = 'signup' | 'payment' | 'both';

export interface ReferralRule {
  id: number;
  name: string;
  type: RewardRuleType | string;
  value: number;
  unit: string;
  eligibility: RewardRuleEligibility | string;
  conditionTrigger: RewardRuleCondition | string;
  isActive: boolean;
  expiryDays?: number;
  createdAt: string;
}
