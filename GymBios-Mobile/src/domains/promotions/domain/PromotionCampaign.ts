export type PromotionStatus =
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'paused'
  | 'draft'
  | (string & {});

export type PromotionType =
  | 'discount'
  | 'voucher'
  | 'combo'
  | 'bogo'
  | 'seasonal'
  | 'loyalty'
  | 'promotional-access-days'
  | (string & {});

export type DiscountType =
  | 'percentage'
  | 'fixed'
  | (string & {});

export interface PromotionCampaignRequest {
  name: string;
  type: PromotionType;
  status?: PromotionStatus;
  description?: string;
  startDate?: string;
  endDate?: string;

  discountType?: DiscountType;
  discountValue?: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  usageCount?: number;
  usageLimitPerMember?: number;
  code?: string;

  applicablePlans?: string[];
  applicableServices?: string[];
  targetAudience?: string;
  specificMembers?: string[];
  channels?: string[];
  autoApply?: boolean;
  stackable?: boolean;
  priority?: number;
  category?: string;
  tags?: string[];

  totalRevenue?: number;
  totalSavings?: number;
  conversionRate?: number;
  clickCount?: number;
  redemptionRate?: number;
  averageOrderValue?: number;

  image?: string;
  termsAndConditions?: string;
  isPublic?: boolean;

  policyRulesJson?: string;
  policyConfigJson?: string;

  createdBy?: string;
}

export interface PromotionCampaignResponse {
  id: number;
  name: string;
  type: PromotionType;
  status: PromotionStatus;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdDate?: string | null;

  discountType?: DiscountType | null;
  discountValue: number;
  minimumPurchase?: number | null;
  maximumDiscount?: number | null;
  usageLimit?: number | null;
  usageCount?: number | null;
  usageLimitPerMember?: number | null;
  code?: string | null;

  applicablePlans?: string[] | null;
  applicableServices?: string[] | null;
  targetAudience?: string | null;
  specificMembers?: string[] | null;
  channels?: string[] | null;
  autoApply: boolean;
  stackable: boolean;
  priority?: number | null;
  category?: string | null;
  tags?: string[] | null;

  createdBy?: string | null;
  totalRevenue: number;
  totalSavings: number;
  conversionRate: number;
  clickCount: number;
  redemptionRate: number;
  averageOrderValue: number;

  image?: string | null;
  termsAndConditions?: string | null;
  isPublic: boolean;

  policyRulesJson?: string | null;
  policyConfigJson?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
}

export type PromotionCampaign = PromotionCampaignResponse;
