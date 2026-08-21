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
}

export interface BenefitInfo {
  id: string;
  name: string;
  description?: string;
}

export interface FreezeInfo {
  available: boolean;
  allowed_days: number;
  is_frozen: boolean;
  start_date?: string;
  end_date?: string;
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
  price: number;
  discount: number;
  duration: string;
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
  discountAmount: number;
  finalAmount: number;
  features: string[];
}

export interface MembershipChangeRequest {
  planId: number;
  paymentMethodUsed: string;
  paymentBreakdown: any[]; // Matches PaymentResult.breakdown
}
