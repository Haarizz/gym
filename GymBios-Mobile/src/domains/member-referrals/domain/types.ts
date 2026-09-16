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
