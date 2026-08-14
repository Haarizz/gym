import type { PromotionCampaignResponse } from './PromotionCampaign';

export type BulkPromotionActionType =
  | 'activate'
  | 'pause'
  | 'deactivate'
  | 'delete'
  | 'duplicate'
  | (string & {});

export interface BulkPromotionActionRequest {
  action: BulkPromotionActionType;
  ids: number[];
}

export interface BulkPromotionActionMessageResponse {
  message: string;
  count?: string;
}

export type BulkPromotionActionResponse =
  | BulkPromotionActionMessageResponse
  | PromotionCampaignResponse[];
