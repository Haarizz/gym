export interface ReferralSettings {
  programEnabled: boolean;
  autoGenerateCodes: boolean;
  emailNotifications: boolean;
  autoProcessRewards: boolean;
  codePrefix: string;
  linkDomain: string;
  maxRewardsPerMember?: number | null;
  expiryDays: number;
  minPurchaseAmount?: number | null;
}

export type UpdateReferralSettingsPayload = Partial<ReferralSettings>;
