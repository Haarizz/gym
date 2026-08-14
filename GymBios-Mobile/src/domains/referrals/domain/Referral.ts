export type ReferralStatus = 'pending' | 'successful' | 'expired';

export interface Referral {
  id: number;
  referralId: string;
  referrerMemberId?: string;
  referrerName: string;
  refereeName: string;
  refereeEmail?: string;
  refereePhone?: string;
  referralCode: string;
  referralLink: string;
  status: ReferralStatus;
  rewardAmount?: number;
  date: string;
  signupDate?: string;
  paymentDate?: string;
  notes?: string;
  ruleId?: number;
  ruleName?: string;
  rewardRedeemed?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ReferralPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface ReferralPage {
  referrals: Referral[];
  pagination: ReferralPagination;
}
