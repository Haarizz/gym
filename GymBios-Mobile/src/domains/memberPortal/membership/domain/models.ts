export interface MembershipPlanInfo {
  id: number;
  name: string;
  price: number;
  duration: string;
}

export interface MembershipInfo {
  id: number;
  plan: MembershipPlanInfo;
  status: string;
  start_date: string;
  expiry_date: string;
  auto_renew: boolean;
  total_days: number;
  remaining_days: number;
  /** The member's branch at this gym (null when they have no membership). */
  branch_id?: number | null;
}

export interface BenefitInfo {
  id: string;
  name: string;
  description?: string;
}

export type FreezeUnavailableReason = 'PLAN_DOES_NOT_ALLOW' | 'NO_DAYS_LEFT' | 'NO_FREEZES_LEFT';

/** The plan's freeze policy and what's left of it in the current plan period. */
export interface FreezeInfo {
  available: boolean;
  /** Days that can still be frozen this plan period. */
  allowed_days: number;
  is_frozen: boolean;
  start_date?: string;
  end_date?: string;
  max_days: number;
  used_days: number;
  /** null = the plan sets no limit on the number of freezes. */
  max_occurrences: number | null;
  used_occurrences: number;
  remaining_occurrences: number | null;
  /** Days that can still be frozen at no charge; days beyond this cost charge_per_extra_day each. */
  free_days_remaining: number;
  charge_per_extra_day: number;
  currency_symbol: string | null;
  auto_unfreeze: boolean;
  unavailable_reason: FreezeUnavailableReason | null;
  unavailable_message: string | null;
}

export interface FreezeMembershipResult {
  freezeEnd: string;
  days: number;
  freeDaysApplied: number;
  chargedDays: number;
  chargeAmount: number;
}

export interface RenewalOfferInfo {
  available: boolean;
  discount_percentage?: number;
  description?: string;
  perks?: string[];
}

export interface MemberMembershipState {
  membership: MembershipInfo;
  benefits: BenefitInfo[];
  freeze: FreezeInfo;
  renewal_offer: RenewalOfferInfo;
}

export interface MembershipPayment {
  id: number;
  receiptNo: string;
  transactionDate: string;
  transactionType: string;
  amount: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
  /** Taken off this bill's amount (offer / code / Reward Pass / staff discount). */
  discountAmount?: number | null;
  /** What the discount was, e.g. "Offer: Diwali + Code NEWMEMBER2026". */
  discountLabel?: string | null;
}

export interface MobileReceiptDetail {
  id: number;
  receiptNo: string;
  transactionDate: string;
  transactionType: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  status: string;
  planName?: string;
  validFrom?: string;
  validTill?: string;
  processedBy?: string;
  memberName?: string;
  memberId?: string;
  memberPhone?: string;
  membershipType?: string;
  remarks?: string;
  discountAmount?: number | null;
  discountLabel?: string | null;
}

export interface AddOn {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  pricingUnit: string;
}

export interface ActiveAddOn {
  id: number;
  addonName: string;
  category: string;
  expiryDate: string;
  status: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
}

export interface AddOnCatalogResponse {
  available: AddOn[];
  pagination: PaginationInfo;
  active: ActiveAddOn[];
}

export interface MobileMembershipPlan {
  id: number;
  name: string;
  /** Regular price. */
  price: number;
  /** The plan offer's discount today (flat amount); 0 when none. */
  discount: number;
  offerLabel: string | null;
  /** price − discount: what the member pays before any code or Reward Pass. */
  effectivePrice: number;
  duration: string;
  /** 'Family' / 'Couple' plans are switched to through the family screen. */
  planType?: string;
  features: string[];
}

export interface MobileMembershipPlanPage {
  plans: MobileMembershipPlan[];
  pagination: PaginationInfo;
}

export interface MembershipChangePreviewResponse {
  selectedPlan: MobileMembershipPlan;
  operation: 'RENEWAL' | 'UPGRADE' | 'DOWNGRADE';
  regularAmount: number;
  /** The plan's running offer (0 when none). */
  discountAmount: number;
  offerLabel: string | null;
  // Reward Pass / coupon discount, taken off after the plan's offer.
  rewardDiscountAmount: number;
  finalAmount: number;
  features: string[];
}

export interface MembershipChangeRequest {
  planId: number;
  paymentMethodUsed: string;
  paymentBreakdown: any[]; // Matches PaymentResult.breakdown
  // At most one: a MEMBERSHIP_DISCOUNT Reward Pass or a shareable referral coupon.
  rewardPassId?: number;
  couponCode?: string;
}
