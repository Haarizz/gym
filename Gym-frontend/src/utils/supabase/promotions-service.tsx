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
}

export const promotionsService = new PromotionsService();
