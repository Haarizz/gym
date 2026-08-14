import { apiClient } from '@/core/network/apiClient';
import type { PromotionRepository } from '../application/PromotionRepository';
import type {
  PromotionCampaignRequest,
  PromotionCampaignResponse,
} from '../domain/PromotionCampaign';
import type { EligibleMember } from '../domain/EligibleMember';
import type {
  ApplyAccessDaysRequest,
  ApplyAccessDaysResponse,
} from '../domain/AccessDays';
import type { BulkPromotionActionResponse } from '../domain/BulkPromotion';

export class ApiPromotionRepository implements PromotionRepository {
  async getPromotions(status?: string): Promise<PromotionCampaignResponse[]> {
    const response = await apiClient.get<PromotionCampaignResponse[]>('/promotions', {
      params: status ? { status } : undefined,
    });
    return response.data;
  }

  async getPromotionById(id: number): Promise<PromotionCampaignResponse> {
    const response = await apiClient.get<PromotionCampaignResponse>(
      `/promotions/${id}`,
    );
    return response.data;
  }

  async createPromotion(
    request: PromotionCampaignRequest,
  ): Promise<PromotionCampaignResponse> {
    const response = await apiClient.post<PromotionCampaignResponse>(
      '/promotions',
      request,
    );
    return response.data;
  }

  async updatePromotion(
    id: number,
    request: PromotionCampaignRequest,
  ): Promise<PromotionCampaignResponse> {
    const response = await apiClient.put<PromotionCampaignResponse>(
      `/promotions/${id}`,
      request,
    );
    return response.data;
  }

  async deletePromotion(id: number): Promise<void> {
    await apiClient.delete(`/promotions/${id}`);
  }

  async duplicatePromotion(id: number): Promise<PromotionCampaignResponse> {
    const response = await apiClient.post<PromotionCampaignResponse>(
      `/promotions/${id}/duplicate`,
    );
    return response.data;
  }

  async bulkAction(
    action: string,
    ids: number[],
  ): Promise<BulkPromotionActionResponse> {
    const response = await apiClient.post<BulkPromotionActionResponse>(
      '/promotions/bulk',
      { action, ids },
    );
    return response.data;
  }

  async validateCode(code: string): Promise<PromotionCampaignResponse> {
    const response = await apiClient.get<PromotionCampaignResponse>(
      '/promotions/validate-code',
      {
        params: { code },
      },
    );
    return response.data;
  }

  async redeemPromotion(
    id: number,
    revenue?: number,
    savings?: number,
  ): Promise<PromotionCampaignResponse> {
    const params: Record<string, number> = {};
    if (revenue !== undefined) params.revenue = revenue;
    if (savings !== undefined) params.savings = savings;

    const response = await apiClient.post<PromotionCampaignResponse>(
      `/promotions/${id}/redeem`,
      null,
      { params },
    );
    return response.data;
  }

  async getEligibilityMembers(): Promise<EligibleMember[]> {
    const response = await apiClient.get<EligibleMember[]>(
      '/promotions/eligibility-members',
    );
    return response.data;
  }

  async applyAccessDays(
    request: ApplyAccessDaysRequest,
  ): Promise<ApplyAccessDaysResponse> {
    const response = await apiClient.post<ApplyAccessDaysResponse>(
      '/promotions/apply-access-days',
      request,
    );
    return response.data;
  }
}
