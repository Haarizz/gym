import { authService } from "./auth-service";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface PromotionApi {
  id: number;
  name: string;
  type: string;
  status: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  discountType?: string | null;
  discountValue?: number | null;
  minimumPurchase?: number | null;
  maximumDiscount?: number | null;
  usageLimit?: number | null;
  usageCount?: number | null;
  usageLimitPerMember?: number | null;
  code?: string | null;

  applicablePlans?: string[];
  applicableServices?: string[];
  targetAudience?: string | null;
  specificMembers?: string[];
  channels?: string[];
  autoApply?: boolean | null;
  stackable?: boolean | null;
  priority?: number | null;
  category?: string | null;
  tags?: string[];

  createdBy?: string | null;
  totalRevenue?: number | null;
  totalSavings?: number | null;
  conversionRate?: number | null;
  clickCount?: number | null;
  redemptionRate?: number | null;
  averageOrderValue?: number | null;

  image?: string | null;
  termsAndConditions?: string | null;
  isPublic?: boolean | null;

  policyRulesJson?: string | null;
  policyConfigJson?: string | null;
}

export interface PromotionRequest {
  name?: string;
  type?: string;
  status?: string;
  description?: string;
  startDate?: string;
  endDate?: string;

  discountType?: string;
  discountValue?: number | string;
  minimumPurchase?: number | string;
  maximumDiscount?: number | string;
  usageLimit?: number | string;
  usageCount?: number;
  usageLimitPerMember?: number | string;
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

  createdBy?: string;
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
}

export interface EligibleMemberApi {
  id: string;
  name: string;
  email?: string | null;
  membershipType?: string | null;
  joinedAt?: string | null;
  currentPlan?: { name: string; durationMonths: number } | null;
  renewalCount?: number | null;
  purchaseDate?: string | null;
}

export interface AccessDaysMatch {
  ruleId: string;
  memberId: string;
  rewardDays: number;
}

export interface ApplyAccessDaysResult {
  success: boolean;
  appliedCount: number;
  skippedCount: number;
  totalDaysApplied: number;
  appliedAt: string;
  skippedMemberIds: string[];
}

class PromotionsService {
  async getPromotions(status?: string): Promise<PromotionApi[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions?${params.toString()}`
    );
    if (!response.ok) throw new Error(`Failed to fetch promotions: ${response.status}`);
    return response.json();
  }

  /**
   * Fetch active discount promotions for use in the member creation discount dropdown.
   * Filters to only type="discount" promotions that are within their valid date range
   * and haven't exceeded their usage limit.
   */
  async getActiveDiscountPromotions(): Promise<PromotionApi[]> {
    const all = await this.getPromotions("active");
    const now = new Date();
    return all.filter(p => {
      if (p.type !== "discount") return false;
      // Check date range
      if (p.endDate) {
        const end = new Date(p.endDate);
        end.setHours(23, 59, 59, 999);
        if (end < now) return false;
      }
      if (p.startDate) {
        const start = new Date(p.startDate);
        start.setHours(0, 0, 0, 0);
        if (start > now) return false;
      }
      // Check usage limit
      if (p.usageLimit != null && p.usageCount != null && p.usageCount >= p.usageLimit) return false;
      return true;
    });
  }

  async getPromotionById(id: number): Promise<PromotionApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/${id}`
    );
    if (!response.ok) throw new Error(`Failed to fetch promotion: ${response.status}`);
    return response.json();
  }

  async createPromotion(data: PromotionRequest): Promise<PromotionApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions`,
      { method: "POST", body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to create promotion: ${response.status}`);
    return response.json();
  }

  async updatePromotion(id: number, data: PromotionRequest): Promise<PromotionApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/${id}`,
      { method: "PUT", body: JSON.stringify(data) }
    );
    if (!response.ok) throw new Error(`Failed to update promotion: ${response.status}`);
    return response.json();
  }

  async deletePromotion(id: number): Promise<void> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error(`Failed to delete promotion: ${response.status}`);
  }

  async duplicatePromotion(id: number): Promise<PromotionApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/${id}/duplicate`,
      { method: "POST" }
    );
    if (!response.ok) throw new Error(`Failed to duplicate promotion: ${response.status}`);
    return response.json();
  }

  async bulkAction(action: string, ids: number[]): Promise<void | PromotionApi[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/bulk`,
      { method: "POST", body: JSON.stringify({ action, ids }) }
    );
    if (!response.ok) throw new Error(`Failed to run bulk action: ${response.status}`);
    return response.json();
  }

  /**
   * Validate a promotion code. Returns the promotion if valid,
   * or throws with a user-friendly error message.
   */
  async validateCode(code: string): Promise<PromotionApi> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/validate-code?code=${encodeURIComponent(code)}`
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Invalid promotion code`);
    }
    return response.json();
  }

  /**
   * Record a promotion redemption (increments usage count).
   * Call this after a member is successfully created with a promotion discount.
   */
  async redeemPromotion(id: number, revenue?: number, savings?: number): Promise<PromotionApi> {
    const params = new URLSearchParams();
    if (revenue !== undefined) params.append('revenue', revenue.toString());
    if (savings !== undefined) params.append('savings', savings.toString());
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/${id}/redeem${queryString}`,
      { method: "POST" }
    );
    if (!response.ok) throw new Error(`Failed to redeem promotion: ${response.status}`);
    return response.json();
  }

  /**
   * Real member data shaped for the policyRuleEngine, used to preview and
   * apply Promotional Access Days rules against actual members.
   */
  async getEligibilityMembers(): Promise<EligibleMemberApi[]> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/eligibility-members`
    );
    if (!response.ok) throw new Error(`Failed to fetch eligibility members: ${response.status}`);
    return response.json();
  }

  /**
   * Durably grants the matched members their promotional access days
   * (extends membership expiry) and records an audit trail. Idempotent per
   * (promotion, member) on the backend.
   */
  async applyAccessDays(promotionId: number, matches: AccessDaysMatch[]): Promise<ApplyAccessDaysResult> {
    const response = await authService.makeAuthenticatedRequest(
      `${backendBaseUrl}/promotions/apply-access-days`,
      { method: "POST", body: JSON.stringify({ promotionId, matches }) }
    );
    if (!response.ok) throw new Error(`Failed to apply access days: ${response.status}`);
    return response.json();
  }
}

export const promotionsService = new PromotionsService();

