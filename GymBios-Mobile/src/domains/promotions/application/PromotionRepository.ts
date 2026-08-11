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

export interface PromotionRepository {
  getPromotions(status?: string): Promise<PromotionCampaignResponse[]>;
  getPromotionById(id: number): Promise<PromotionCampaignResponse>;
  createPromotion(request: PromotionCampaignRequest): Promise<PromotionCampaignResponse>;
  updatePromotion(id: number, request: PromotionCampaignRequest): Promise<PromotionCampaignResponse>;
  deletePromotion(id: number): Promise<void>;
  duplicatePromotion(id: number): Promise<PromotionCampaignResponse>;
  bulkAction(action: string, ids: number[]): Promise<BulkPromotionActionResponse>;
  validateCode(code: string): Promise<PromotionCampaignResponse>;
  redeemPromotion(id: number, revenue?: number, savings?: number): Promise<PromotionCampaignResponse>;
  getEligibilityMembers(): Promise<EligibleMember[]>;
  applyAccessDays(request: ApplyAccessDaysRequest): Promise<ApplyAccessDaysResponse>;
}
