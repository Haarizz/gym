import type { Referral, ReferralPage } from '../domain/Referral';
import type { ReferralStats } from '../domain/ReferralStats';
import type { ReferralRule } from '../domain/ReferralRule';
import type { ReferralSettings, UpdateReferralSettingsPayload } from '../domain/ReferralSettings';
import type { ReferralListParams } from '../domain/ReferralListParams';
import type {
  CreateReferralPayload,
  UpdateReferralPayload,
  MarkSuccessfulPayload,
  ReferralValidationResponse,
} from '../domain/ReferralPayloads';

export interface ReferralRepository {
  getStats(): Promise<ReferralStats>;
  getReferrals(params?: ReferralListParams): Promise<ReferralPage>;
  getById(id: number): Promise<Referral>;
  getRules(): Promise<ReferralRule[]>;
  getSettings(): Promise<ReferralSettings>;
  updateSettings(payload: UpdateReferralSettingsPayload): Promise<ReferralSettings>;

  create(payload: CreateReferralPayload): Promise<Referral>;
  update(id: number, payload: UpdateReferralPayload): Promise<Referral>;
  delete(id: number): Promise<void>;

  markSuccessful(id: number, payload?: MarkSuccessfulPayload): Promise<Referral>;
  markExpired(id: number): Promise<Referral>;

  getUnredeemedReward(memberId: string): Promise<Referral | null>;
  redeemReward(id: number): Promise<Referral>;
  validateCode(code: string): Promise<ReferralValidationResponse>;

  fixRewards(): Promise<void>;
}
