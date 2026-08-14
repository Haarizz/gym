import type { ReferralRepository } from './ReferralRepository';
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

export class ReferralService {
  constructor(private readonly repository: ReferralRepository) {}

  getStats(): Promise<ReferralStats> {
    return this.repository.getStats();
  }

  getReferrals(params?: ReferralListParams): Promise<ReferralPage> {
    return this.repository.getReferrals(params);
  }

  getById(id: number): Promise<Referral> {
    return this.repository.getById(id);
  }

  getRules(): Promise<ReferralRule[]> {
    return this.repository.getRules();
  }

  getSettings(): Promise<ReferralSettings> {
    return this.repository.getSettings();
  }

  updateSettings(payload: UpdateReferralSettingsPayload): Promise<ReferralSettings> {
    return this.repository.updateSettings(payload);
  }

  create(payload: CreateReferralPayload): Promise<Referral> {
    return this.repository.create(payload);
  }

  update(id: number, payload: UpdateReferralPayload): Promise<Referral> {
    return this.repository.update(id, payload);
  }

  delete(id: number): Promise<void> {
    return this.repository.delete(id);
  }

  markSuccessful(id: number, payload?: MarkSuccessfulPayload): Promise<Referral> {
    return this.repository.markSuccessful(id, payload);
  }

  markExpired(id: number): Promise<Referral> {
    return this.repository.markExpired(id);
  }

  getUnredeemedReward(memberId: string): Promise<Referral | null> {
    return this.repository.getUnredeemedReward(memberId);
  }

  redeemReward(id: number): Promise<Referral> {
    return this.repository.redeemReward(id);
  }

  validateCode(code: string): Promise<ReferralValidationResponse> {
    return this.repository.validateCode(code);
  }

  fixRewards(): Promise<void> {
    return this.repository.fixRewards();
  }
}
