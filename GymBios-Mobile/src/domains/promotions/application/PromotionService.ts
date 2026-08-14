import type { PromotionRepository } from './PromotionRepository';
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

export class PromotionService {
  constructor(private readonly repository: PromotionRepository) {}

  getPromotions(status?: string): Promise<PromotionCampaignResponse[]> {
    return this.repository.getPromotions(status);
  }

  getPromotionById(id: number): Promise<PromotionCampaignResponse> {
    return this.repository.getPromotionById(id);
  }

  createPromotion(request: PromotionCampaignRequest): Promise<PromotionCampaignResponse> {
    return this.repository.createPromotion(request);
  }

  updatePromotion(
    id: number,
    request: PromotionCampaignRequest,
  ): Promise<PromotionCampaignResponse> {
    return this.repository.updatePromotion(id, request);
  }

  deletePromotion(id: number): Promise<void> {
    return this.repository.deletePromotion(id);
  }

  duplicatePromotion(id: number): Promise<PromotionCampaignResponse> {
    return this.repository.duplicatePromotion(id);
  }

  bulkAction(action: string, ids: number[]): Promise<BulkPromotionActionResponse> {
    return this.repository.bulkAction(action, ids);
  }

  validateCode(code: string): Promise<PromotionCampaignResponse> {
    return this.repository.validateCode(code);
  }

  redeemPromotion(
    id: number,
    revenue?: number,
    savings?: number,
  ): Promise<PromotionCampaignResponse> {
    return this.repository.redeemPromotion(id, revenue, savings);
  }

  getEligibilityMembers(): Promise<EligibleMember[]> {
    return this.repository.getEligibilityMembers();
  }

  applyAccessDays(
    request: ApplyAccessDaysRequest,
  ): Promise<ApplyAccessDaysResponse> {
    return this.repository.applyAccessDays(request);
  }
}
